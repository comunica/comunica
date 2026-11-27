import type {
  BindingsStream,
  ComunicaDataFactory,
  IQuerySource,
  MetadataBindings,
  MetadataQuads,
  QuerySourceReference,
} from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import { BlankNodeScoped } from '@comunica/utils-data-factory';
import { SeekableMappingIterator, seekBindingsStream } from '@comunica/utils-iterator';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { mapTermsNested, someTermsNested } from 'rdf-terms';

export const SKOLEM_PREFIX = 'urn:comunica_skolem:source_';

const AF = new AlgebraFactory();

/**
 * Get the unique, deterministic id for the given source.
 * @param sourceIds ID's of datasources, see KeysRdfResolveQuadPattern.sourceIds.
 * @param source A data source.
 * @return The id of the given source.
 */
export function getSourceId(sourceIds: Map<QuerySourceReference, string>, source: IQuerySource): string {
  let sourceId = sourceIds.get(source.referenceValue);
  if (sourceId === undefined) {
    sourceId = `${sourceIds.size}`;
    sourceIds.set(source.referenceValue, sourceId);
  }
  return sourceId;
}

/**
 * If the given term is a blank node, return a deterministic named node for it
 * based on the source id and the blank node value.
 * @param dataFactory The data factory.
 * @param term Any RDF term.
 * @param sourceId A source identifier.
 * @return If the given term was a blank node, this will return a skolemized named node, otherwise the original term.
 */
export function skolemizeTerm(
  dataFactory: ComunicaDataFactory,
  term: RDF.Term,
  sourceId: string,
): RDF.Term | BlankNodeScoped {
  if (term.termType === 'BlankNode') {
    return new BlankNodeScoped(`bc_${sourceId}_${term.value}`, dataFactory.namedNode(`${SKOLEM_PREFIX}${sourceId}:${term.value}`));
  }
  return term;
}

/**
 * Skolemize all terms in the given quad.
 * @param dataFactory The data factory.
 * @param quad An RDF quad.
 * @param sourceId A source identifier.
 * @return The skolemized quad.
 */
export function skolemizeQuad<Q extends RDF.BaseQuad = RDF.Quad>(
  dataFactory: ComunicaDataFactory,
  quad: Q,
  sourceId: string,
): Q {
  return mapTermsNested(quad, term => skolemizeTerm(dataFactory, term, sourceId));
}

/**
 * Skolemize all terms in the given bindings.
 * @param dataFactory The data factory.
 * @param bindings An RDF bindings object.
 * @param sourceId A source identifier.
 * @return The skolemized bindings.
 */
export function skolemizeBindings(
  dataFactory: ComunicaDataFactory,
  bindings: RDF.Bindings,
  sourceId: string,
): RDF.Bindings {
  // Only blank nodes are skolemized, so bindings without them can be returned as-is.
  let hasBlankNodes = false;
  for (const term of bindings.values()) {
    if (term.termType === 'BlankNode' || term.termType === 'Quad') {
      hasBlankNodes = true;
      break;
    }
  }
  if (!hasBlankNodes) {
    return bindings;
  }
  return bindings.map((term) => {
    if (term.termType === 'Quad') {
      return skolemizeQuad(dataFactory, term, sourceId);
    }
    return skolemizeTerm(dataFactory, term, sourceId);
  });
}

/**
 * Skolemize all terms in the given quad stream.
 * @param dataFactory The data factory.
 * @param iterator An RDF quad stream.
 * @param sourceId A source identifier.
 * @return The skolemized quad stream.
 */
export function skolemizeQuadStream(
  dataFactory: ComunicaDataFactory,
  iterator: AsyncIterator<RDF.Quad>,
  sourceId: string,
): AsyncIterator<RDF.Quad> {
  const ret = iterator.map(quad => skolemizeQuad(dataFactory, quad, sourceId));
  function inheritMetadata(): void {
    iterator.getProperty('metadata', (metadata: MetadataQuads) => {
      ret.setProperty('metadata', metadata);
      metadata.state.addInvalidateListener(inheritMetadata);
    });
  }
  inheritMetadata();
  return ret;
}

/**
 * Skolemize all terms in the given bindings stream.
 * @param dataFactory The data factory.
 * @param iterator An RDF bindings stream.
 * @param sourceId A source identifier.
 * @return The skolemized bindings stream.
 */
export function skolemizeBindingsStream(
  dataFactory: ComunicaDataFactory,
  iterator: BindingsStream,
  sourceId: string,
): BindingsStream {
  const ret = new SeekableMappingIterator(
    iterator,
    bindings => skolemizeBindings(dataFactory, bindings, sourceId),
    (target) => {
      let deskolemized = target;
      for (const [ key, value ] of target) {
        const term = deskolemizeTerm(dataFactory, value, sourceId);
        // A term skolemized by another source has no counterpart here, so there is nothing to skip to.
        if (term === null) {
          return;
        }
        if (term !== value) {
          deskolemized = deskolemized.set(key, term);
        }
      }
      seekBindingsStream(iterator, deskolemized);
    },
  );

  function inheritMetadata(): void {
    iterator.getProperty('metadata', (metadata: MetadataBindings) => {
      ret.setProperty('metadata', metadata);
      metadata.state.addInvalidateListener(inheritMetadata);
    });
  }
  inheritMetadata();
  return ret;
}

/**
 * If a given term was a skolemized named node for the given source id,
 * deskolemize it again to a blank node.
 * If the given term was a skolemized named node for another source, return false.
 * If the given term was not a skolemized named node, return the original term.
 * @param dataFactory The data factory.
 * @param term Any RDF term.
 * @param sourceId A source identifier.
 */
export function deskolemizeTerm(
  dataFactory: ComunicaDataFactory,
  term: RDF.Term,
  sourceId: string,
): RDF.Term | null {
  if (term.termType === 'BlankNode' && 'skolemized' in term) {
    term = (<BlankNodeScoped> term).skolemized;
  }
  if (term.termType === 'NamedNode' && term.value.startsWith(SKOLEM_PREFIX)) {
    const colonSeparator = term.value.indexOf(':', SKOLEM_PREFIX.length);
    const termSourceId = term.value.slice(SKOLEM_PREFIX.length, colonSeparator);
    // We had a skolemized term
    if (termSourceId === sourceId) {
      // It came from the correct source
      const termLabel = term.value.slice(colonSeparator + 1, term.value.length);
      return dataFactory.blankNode(termLabel);
    }
    // It came from a different source
    return null;
  }
  return term;
}

/**
 * Deskolemize the given term, including the terms within quoted triples.
 * @param dataFactory The data factory.
 * @param term Any RDF term.
 * @param sourceId A source identifier.
 * @return The deskolemized term, or null if it contains a skolemized term that is not in scope for this source.
 */
export function deskolemizeTermNested(
  dataFactory: ComunicaDataFactory,
  term: RDF.Term,
  sourceId: string,
): RDF.Term | null {
  if (term.termType === 'Quad') {
    let outOfScope = false;
    const ret = mapTermsNested(term, (subTerm) => {
      const deskolemized = deskolemizeTerm(dataFactory, subTerm, sourceId);
      outOfScope ||= deskolemized === null;
      return deskolemized ?? subTerm;
    });
    return outOfScope ? null : ret;
  }
  return deskolemizeTerm(dataFactory, term, sourceId);
}

/**
 * @deprecated Use {@link deskolemizeTermNested} instead, which returns null instead of throwing.
 */
// TODO (next-major): remove
export function deskolemizeTermNestedThrowing(
  dataFactory: ComunicaDataFactory,
  term: RDF.Term,
  sourceId: string,
): RDF.Term {
  const ret = deskolemizeTermNested(dataFactory, term, sourceId);
  if (ret === null) {
    throw new Error(`Skolemized term is not in scope for this source`);
  }
  return ret;
}

/**
 * Deskolemize all terms in the given quad.
 * @param dataFactory The data factory.
 * @param quad An RDF quad.
 * @param sourceId A source identifier.
 * @return The deskolemized quad.
 */
export function deskolemizeQuad<Q extends RDF.BaseQuad = RDF.Quad>(
  dataFactory: ComunicaDataFactory,
  quad: Q,
  sourceId: string,
): Q {
  return mapTermsNested(quad, (term: RDF.Term): RDF.Term => {
    const newTerm = deskolemizeTerm(dataFactory, term, sourceId);
    // If the term was skolemized in a different source then don't deskolemize it
    return newTerm ?? term;
  });
}

/**
 * Deskolemize all terms in the given pattern, without traversing it as a generic operation.
 * Will return undefined if there is at least one blank node not in scope for this sourceId.
 * @param dataFactory The data factory.
 * @param pattern A quad pattern.
 * @param sourceId A source identifier.
 */
export function deskolemizePattern(
  dataFactory: ComunicaDataFactory,
  pattern: Algebra.Pattern,
  sourceId: string,
): Algebra.Pattern | undefined {
  const subject = deskolemizeTermNested(dataFactory, pattern.subject, sourceId);
  const predicate = subject && deskolemizeTermNested(dataFactory, pattern.predicate, sourceId);
  const object = predicate && deskolemizeTermNested(dataFactory, pattern.object, sourceId);
  const graph = object && deskolemizeTermNested(dataFactory, pattern.graph, sourceId);
  if (graph) {
    return Object.assign(AF.createPattern(subject, predicate, object, graph), { metadata: pattern.metadata });
  }
}

/**
 * Deskolemize all terms in the given quad.
 * Will return undefined if there is at least one blank node not in scope for this sourceId.
 * @param dataFactory The data factory.
 * @param operation An algebra operation.
 * @param sourceId A source identifier.
 */
export function deskolemizeOperation<O extends Algebra.Operation>(
  dataFactory: ComunicaDataFactory,
  operation: O,
  sourceId: string,
): O | undefined {
  let outOfScope = false;
  const deskolemize = (term: RDF.Term): RDF.Term => {
    const deskolemized = deskolemizeTermNested(dataFactory, term, sourceId);
    outOfScope ||= deskolemized === null;
    return deskolemized ?? term;
  };
  const mapped = <O> algebraUtils.mapOperation(operation, {
    [Algebra.Types.PATTERN]: {
      preVisitor: () => ({ continue: false }),
      transform: op => Object.assign(AF.createPattern(
        deskolemize(op.subject),
        deskolemize(op.predicate),
        deskolemize(op.object),
        deskolemize(op.graph),
      ), { metadata: op.metadata }),
    },
    [Algebra.Types.PATH]: {
      preVisitor: () => ({ continue: false }),
      transform: op => Object.assign(AF.createPath(
        deskolemize(op.subject),
        op.predicate,
        deskolemize(op.object),
        deskolemize(op.graph),
      ), { metadata: op.metadata }),
    },
  });
  return outOfScope ? undefined : mapped;
}

/**
 * Check if the given pattern contains blank nodes or skolemized named nodes, also within quoted triples.
 * Only such terms are changed by deskolemization.
 * @param pattern A quad pattern.
 */
export function hasSkolemizedTerms(pattern: Algebra.Pattern): boolean {
  return someTermsNested(<RDF.BaseQuad> <unknown> pattern, term => term.termType === 'BlankNode' ||
    (term.termType === 'NamedNode' && term.value.startsWith(SKOLEM_PREFIX)));
}
