import type {
  BindingsStream,
  ComunicaDataFactory,
  IQuerySource,
  MetadataBindings,
  MetadataQuads,
  QuerySourceReference,
} from '@comunica/types';
import { BlankNodeScoped } from '@comunica/utils-data-factory';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { mapTermsNested } from 'rdf-terms';
import { Algebra, Factory, Util } from 'sparqlalgebrajs';

export const SKOLEM_PREFIX = 'urn:comunica_skolem:source_';

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
  const ret = iterator.map(bindings => skolemizeBindings(dataFactory, bindings, sourceId));
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

export function deskolemizeTermNestedThrowing(
  dataFactory: ComunicaDataFactory,
  term: RDF.Term,
  sourceId: string,
): RDF.Term {
  if (term.termType === 'Quad') {
    return mapTermsNested(term, (subTerm) => {
      const deskolemized = deskolemizeTerm(dataFactory, subTerm, sourceId);
      if (!deskolemized) {
        throw new Error(`Skolemized term is not in scope for this source`);
      }
      return deskolemized;
    });
  }
  const ret = deskolemizeTerm(dataFactory, term, sourceId);
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
  const algebraFactory = new Factory();
  try {
    return <O> Util.mapOperation(operation, {
      [Algebra.types.PATTERN](op, factory) {
        return {
          result: Object.assign(factory.createPattern(
            deskolemizeTermNestedThrowing(dataFactory, op.subject, sourceId),
            deskolemizeTermNestedThrowing(dataFactory, op.predicate, sourceId),
            deskolemizeTermNestedThrowing(dataFactory, op.object, sourceId),
            deskolemizeTermNestedThrowing(dataFactory, op.graph, sourceId),
          ), { metadata: op.metadata }),
          recurse: false,
        };
      },
      [Algebra.types.PATH](op, factory) {
        return {
          result: Object.assign(factory.createPath(
            deskolemizeTermNestedThrowing(dataFactory, op.subject, sourceId),
            op.predicate,
            deskolemizeTermNestedThrowing(dataFactory, op.object, sourceId),
            deskolemizeTermNestedThrowing(dataFactory, op.graph, sourceId),
          ), { metadata: op.metadata }),
          recurse: false,
        };
      },
    }, algebraFactory);
  } catch {
    // Return undefined for skolemized terms not in scope for this source
  }
}
