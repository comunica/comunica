import {
  DataSources, getDataSourceType, getDataSourceValue, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput, IDataSource, ILazyQuadSource, KEY_CONTEXT_SOURCE, KEY_CONTEXT_SOURCES,
} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import * as DataFactory from "@rdfjs/data-model";
import {AsyncIterator, EmptyIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import {RoundRobinUnionIterator} from "asynciterator-union";
import * as RDF from "rdf-js";
import {mapTerms} from "rdf-terms";
import {Algebra, Factory} from "sparqlalgebrajs";
import {BlankNodeScoped} from "./BlankNodeScoped";
import {BaseQuad} from "rdf-js";
import {Quad} from "rdf-js";

/**
 * A FederatedQuadSource can evaluate quad pattern queries over the union of different heterogeneous sources.
 * It will call the given mediator to evaluate each quad pattern query separately.
 */
export class FederatedQuadSource implements ILazyQuadSource {

  private static readonly SKOLEM_PREFIX = 'urn:comunica_skolem:source_';

  protected readonly mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;
  protected readonly sources: DataSources;
  protected readonly contextDefault: ActionContext;
  protected readonly emptyPatterns: Map<IDataSource, RDF.BaseQuad[]>;
  protected readonly sourceIds: Map<IDataSource, string>;
  protected readonly skipEmptyPatterns: boolean;
  protected readonly algebraFactory: Factory;

  constructor(mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>,
              context: ActionContext, emptyPatterns: Map<IDataSource, RDF.Quad[]>,
              skipEmptyPatterns: boolean) {
    this.mediatorResolveQuadPattern = mediatorResolveQuadPattern;
    this.sources = context.get(KEY_CONTEXT_SOURCES);
    this.contextDefault = context.delete(KEY_CONTEXT_SOURCES);
    this.emptyPatterns = emptyPatterns;
    this.sourceIds = new Map();
    this.skipEmptyPatterns = skipEmptyPatterns;
    this.algebraFactory = new Factory();

    // Initialize sources in the emptyPatterns datastructure
    if (this.skipEmptyPatterns) {
      this.sources.iterator().on('data', (source: IDataSource) => {
        if (!this.emptyPatterns.has(source)) {
          this.emptyPatterns.set(source, []);
        }
      });
    }
  }

  /**
   * Check if the given RDF term is not bound to an exact value.
   * I.e., if it is not a Variable.
   * @param {RDF.Term} term An RDF term.
   * @return {boolean} If it is not bound.
   */
  public static isTermBound(term: RDF.Term) {
    return term.termType !== 'Variable';
  }

  /**
   * Checks if the given (child) pattern is a more bound version of the given (parent) pattern.
   * This will also return true if the patterns are equal.
   * @param {RDF.BaseQuad} child A child pattern.
   * @param {RDF.BaseQuad} parent A parent pattern.
   * @return {boolean} If child is a sub-pattern of parent
   */
  public static isSubPatternOf(child: RDF.BaseQuad, parent: RDF.BaseQuad): boolean {
    return (!FederatedQuadSource.isTermBound(parent.subject) || parent.subject.equals(child.subject))
      && (!FederatedQuadSource.isTermBound(parent.predicate) || parent.predicate.equals(child.predicate))
      && (!FederatedQuadSource.isTermBound(parent.object) || parent.object.equals(child.object))
      && (!FederatedQuadSource.isTermBound(parent.graph) || parent.graph.equals(child.graph));
  }

  /**
   * If the given term is a blank node, return a deterministic named node for it
   * based on the source id and the blank node value.
   * @param term Any RDF term.
   * @param sourceId A source identifier.
   * @return If the given term was a blank node, this will return a skolemized named node, otherwise the original term.
   */
  public static skolemizeTerm(term: RDF.Term, sourceId: string): RDF.Term | BlankNodeScoped {
    if (term.termType === 'BlankNode') {
      return new BlankNodeScoped(`bc_${sourceId}_${term.value}`,
        DataFactory.namedNode(`${FederatedQuadSource.SKOLEM_PREFIX}${sourceId}:${term.value}`));
    }
    return term;
  }

  /**
   * Skolemize all terms in the given quad.
   * @param quad An RDF quad.
   * @param sourceId A source identifier.
   * @return The skolemized quad.
   */
  public static skolemizeQuad<Q extends BaseQuad = Quad>(quad: Q, sourceId: string): Q {
    return mapTerms(quad, (term) => FederatedQuadSource.skolemizeTerm(term, sourceId));
  }

  /**
   * If a given term was a skolemized named node for the given source id,
   * deskolemize it again to a blank node.
   * If the given term was a skolemized named node for another source, return false.
   * If the given term was not a skolemized named node, return the original term.
   * @param term Any RDF term.
   * @param sourceId A source identifier.
   */
  public static deskolemizeTerm(term: RDF.Term, sourceId: string): RDF.Term | null {
    if (term.termType === 'BlankNode' && 'skolemized' in term) {
      term = (<BlankNodeScoped> term).skolemized;
    }
    if (term.termType === 'NamedNode') {
      if (term.value.startsWith(FederatedQuadSource.SKOLEM_PREFIX)) {
        const colonSeparator = term.value.indexOf(':', FederatedQuadSource.SKOLEM_PREFIX.length);
        const termSourceId = term.value.substr(FederatedQuadSource.SKOLEM_PREFIX.length, colonSeparator - FederatedQuadSource.SKOLEM_PREFIX.length);
        // We had a skolemized term
        if (termSourceId === sourceId) {
          // It came from the correct source
          const termLabel = term.value.substr(colonSeparator + 1, term.value.length);
          return DataFactory.blankNode(termLabel);
        } else {
          // It came from a different source
          return null;
        }
      }
    }
    return term;
  }

  /**
   * If the given source is guaranteed to produce an empty result for the given pattern.
   *
   * This prediction is done based on the 'emptyPatterns' datastructure that is stored within this actor.
   * Every time an empty pattern is passed, this pattern is stored in this datastructure for this source.
   * If this pattern (or a more bound pattern) is queried, we know for certain that it will be empty again.
   * This is under the assumption that sources will remain static during query evaluation.
   *
   * @param {IQuerySource} source
   * @param {RDF.BaseQuad} pattern
   * @return {boolean}
   */
  public isSourceEmpty(source: IDataSource, pattern: RDF.BaseQuad) {
    if (!this.skipEmptyPatterns) {
      return false;
    }
    const emptyPatterns: RDF.BaseQuad[] = this.emptyPatterns.get(source);
    if (emptyPatterns) {
      for (const emptyPattern of emptyPatterns) {
        if (FederatedQuadSource.isSubPatternOf(pattern, emptyPattern)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get the unique, deterministic id for the given source.
   * @param source A data source.
   * @return The id of the given source.
   */
  public getSourceId(source: IDataSource): string {
    let sourceId = this.sourceIds.get(source);
    if (sourceId === undefined) {
      sourceId = `${this.sourceIds.size}`;
      this.sourceIds.set(source, sourceId);
    }
    return sourceId;
  }

  public matchLazy(subject?: RegExp | RDF.Term,
                   predicate?: RegExp | RDF.Term,
                   object?: RegExp | RDF.Term,
                   graph?: RegExp | RDF.Term): AsyncIterator<RDF.Quad> & RDF.Stream {
    if (subject instanceof RegExp
      || predicate instanceof RegExp
      || object instanceof RegExp
      || graph instanceof RegExp) {
      throw new Error("FederatedQuadSource does not support matching by regular expressions.");
    }

    // Counters for our metadata
    const metadata: {[id: string]: any} = { totalItems: 0 };
    let remainingSources: number = 1;
    let sourcesCount: number = 0;

    // Anonymous function to handle totalItems from metadata
    const checkEmitMetadata = (currentTotalItems: number, source: IDataSource,
                               pattern: RDF.BaseQuad, lastMetadata?: {[id: string]: any}) => {
      if (this.skipEmptyPatterns && !currentTotalItems) {
        // Because another call may have added more information in the meantime
        if (!this.isSourceEmpty(source, pattern)) {
          this.emptyPatterns.get(source).push(pattern);
        }
      }
      if (!remainingSources) {
        if (lastMetadata && sourcesCount === 1) {
          // If we only had one source, emit the metadata as-is.
          it.emit('metadata', lastMetadata);
        } else {
          it.emit('metadata', metadata);
        }
      }
    };

    // TODO: A solution without cloning would be preferred here.
    //       See discussion at https://github.com/comunica/comunica/issues/553
    const sourcesIt = this.sources.iterator();
    const proxyIt: AsyncIterator<PromiseProxyIterator<RDF.Quad>> = sourcesIt.map((source) => {
      const sourceId = this.getSourceId(source);
      remainingSources++;
      sourcesCount++;

      return new PromiseProxyIterator(async () => {
        // Convert falsy terms to variables, reverse operation of {@link ActorRdfResolveQuadPatternSource#variableToNull}.
        // Deskolemize terms, so we send the original blank nodes to each source.
        // Note that some sources may not match bnodes by label. SPARQL endpoints for example consider them variables.
        const s = !subject   ? DataFactory.variable('vs') : FederatedQuadSource.deskolemizeTerm(subject,   sourceId);
        const p = !predicate ? DataFactory.variable('vp') : FederatedQuadSource.deskolemizeTerm(predicate, sourceId);
        const o = !object    ? DataFactory.variable('vo') : FederatedQuadSource.deskolemizeTerm(object,    sourceId);
        const g = !graph     ? DataFactory.variable('vg') : FederatedQuadSource.deskolemizeTerm(graph,     sourceId);
        let pattern: Algebra.Pattern;

        // Prepare the context for this specific source
        const context: ActionContext = this.contextDefault.set(KEY_CONTEXT_SOURCE,
          { type: getDataSourceType(source), value: getDataSourceValue(source) });

        let output: IActorRdfResolveQuadPatternOutput;
        // If any of the deskolemized blank nodes originate from another source,
        // or if we can predict that the given source will have no bindings for the given pattern,
        // return an empty iterator.
        if (!s || !p || !o || !g
          || this.isSourceEmpty(source, pattern = this.algebraFactory.createPattern(s, p, o, g))) {
          output = { data: new EmptyIterator(), metadata: () => Promise.resolve({ totalItems: 0 }) };
        } else {
          output = await this.mediatorResolveQuadPattern.mediate({ pattern, context });
        }
        if (output.metadata) {
          output.metadata().then((subMetadata: {[id: string]: any}) => {
            if ((!subMetadata.totalItems && subMetadata.totalItems !== 0) || !isFinite(subMetadata.totalItems)) {
              metadata.totalItems = Infinity;
              remainingSources = 0; // We're already at infinite, so ignore any later metadata
              checkEmitMetadata(Infinity, source, pattern, subMetadata);
            } else {
              metadata.totalItems += subMetadata.totalItems;
              remainingSources--;
              checkEmitMetadata(subMetadata.totalItems, source, pattern, subMetadata);
            }
          });
        } else {
          metadata.totalItems = Infinity;
          remainingSources = 0; // We're already at infinite, so ignore any later metadata
          checkEmitMetadata(Infinity, source, pattern);
        }

        return output.data.map((quad) => FederatedQuadSource.skolemizeQuad(quad, sourceId));
      });
    });
    const it: RoundRobinUnionIterator<RDF.Quad> = new RoundRobinUnionIterator(proxyIt.clone());
    it.on('newListener', (eventName) => {
      if (eventName === 'metadata') {
        setImmediate(() => proxyIt.clone().each((proxy) => proxy.loadSource()));
      }
    });

    // If we have 0 sources, immediately emit metadata
    sourcesIt.on('end', () => {
      if (!--remainingSources) {
        it.emit('metadata', metadata);
      }
    });

    return it;
  }

  public match(subject?: RegExp | RDF.Term,
               predicate?: RegExp | RDF.Term,
               object?: RegExp | RDF.Term,
               graph?: RegExp | RDF.Term): RDF.Stream {
    return this.matchLazy(subject, predicate, object, graph);
  }
}
