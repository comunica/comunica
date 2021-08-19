import type {
  IActionRdfMetadataAggregate,
  IActorRdfMetadataAggregateOutput,
} from '@comunica/bus-rdf-metadata-aggregate';
import type {
  DataSources, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput, IDataSource, IQuadSource,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import { getDataSourceType, getDataSourceValue, getDataSourceContext } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import type { ActionContext, Actor, IActorTest, Mediator } from '@comunica/core';
import { BlankNodeScoped } from '@comunica/data-factory';
import { AsyncIterator, ArrayIterator, TransformIterator, UnionIterator } from 'asynciterator';

import type { Record } from 'immutable';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { mapTerms } from 'rdf-terms';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

const DF = new DataFactory();

/**
 * A FederatedQuadSource can evaluate quad pattern queries over the union of different heterogeneous sources.
 * It will call the given mediator to evaluate each quad pattern query separately.
 */
export class FederatedQuadSource implements IQuadSource {
  private static readonly SKOLEM_PREFIX = 'urn:comunica_skolem:source_';

  protected readonly mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
  IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;

  protected readonly sources: DataSources;
  protected readonly contextDefault: ActionContext;
  protected readonly emptyPatterns: Map<IDataSource, RDF.BaseQuad[]>;
  protected readonly sourceIds: Map<IDataSource, string>;
  protected readonly skipEmptyPatterns: boolean;
  protected readonly algebraFactory: Factory;

  public readonly mediatorAggregate: Mediator<Actor<IActionRdfMetadataAggregate, IActorTest,
  IActorRdfMetadataAggregateOutput>, IActionRdfMetadataAggregate, IActorTest, IActorRdfMetadataAggregateOutput>;

  public constructor(mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
  IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>,
  context: ActionContext, emptyPatterns: Map<IDataSource, RDF.Quad[]>,
  skipEmptyPatterns: boolean,
  mediatorRdfMetadataAggregate: Mediator<Actor<IActionRdfMetadataAggregate, IActorTest,
  IActorRdfMetadataAggregateOutput>, IActionRdfMetadataAggregate, IActorTest, IActorRdfMetadataAggregateOutput>) {
    this.mediatorResolveQuadPattern = mediatorResolveQuadPattern;
    this.sources = context.get(KeysRdfResolveQuadPattern.sources);
    this.contextDefault = context.delete(KeysRdfResolveQuadPattern.sources);
    this.emptyPatterns = emptyPatterns;
    this.sourceIds = new Map();
    this.skipEmptyPatterns = skipEmptyPatterns;
    this.algebraFactory = new Factory();

    this.mediatorAggregate = mediatorRdfMetadataAggregate;

    // Initialize sources in the emptyPatterns datastructure
    if (this.skipEmptyPatterns) {
      for (const source of this.sources) {
        if (!this.emptyPatterns.has(source)) {
          this.emptyPatterns.set(source, []);
        }
      }
    }
  }

  /**
     * Check if the given RDF term is not bound to an exact value.
     * I.e., if it is not a Variable.
     * @param {RDF.Term} term An RDF term.
     * @return {boolean} If it is not bound.
     */
  public static isTermBound(term: RDF.Term): boolean {
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
    return (!FederatedQuadSource.isTermBound(parent.subject) || parent.subject.equals(child.subject)) &&
            (!FederatedQuadSource.isTermBound(parent.predicate) || parent.predicate.equals(child.predicate)) &&
            (!FederatedQuadSource.isTermBound(parent.object) || parent.object.equals(child.object)) &&
            (!FederatedQuadSource.isTermBound(parent.graph) || parent.graph.equals(child.graph));
  }

  /**
     * If the given term is a blank node, return a deterministic named node for it
     * based on the source id and the blank node value.
     * @param term Any RDF term.
     * @param sourceId A source identifier.
     * @return If the given term was a blank node, this will return a skolemized named node,otherwise the original term.
     */
  public static skolemizeTerm(term: RDF.Term, sourceId: string): RDF.Term | BlankNodeScoped {
    if (term.termType === 'BlankNode') {
      return new BlankNodeScoped(`bc_${sourceId}_${term.value}`,
        DF.namedNode(`${FederatedQuadSource.SKOLEM_PREFIX}${sourceId}:${term.value}`));
    }
    return term;
  }

  /**
     * Skolemize all terms in the given quad.
     * @param quad An RDF quad.
     * @param sourceId A source identifier.
     * @return The skolemized quad.
     */
  public static skolemizeQuad<Q extends RDF.BaseQuad = RDF.Quad>(quad: Q, sourceId: string): Q {
    return mapTerms(quad, term => FederatedQuadSource.skolemizeTerm(term, sourceId));
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
      term = (<BlankNodeScoped>term).skolemized;
    }
    if (term.termType === 'NamedNode' && term.value.startsWith(FederatedQuadSource.SKOLEM_PREFIX)) {
      const colonSeparator = term.value.indexOf(':', FederatedQuadSource.SKOLEM_PREFIX.length);
      const termSourceId = term.value.slice(FederatedQuadSource.SKOLEM_PREFIX.length, colonSeparator);
      // We had a skolemized term
      if (termSourceId === sourceId) {
        // It came from the correct source
        const termLabel = term.value.slice(colonSeparator + 1, term.value.length);
        return DF.blankNode(termLabel);
      }
      // It came from a different source
      return null;
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
  public isSourceEmpty(source: IDataSource, pattern: RDF.BaseQuad): boolean {
    if (!this.skipEmptyPatterns) {
      return false;
    }
    const emptyPatterns: RDF.BaseQuad[] | undefined = this.emptyPatterns.get(source);
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

  private checkPushEmptyPattern(md: Record<string, any> | undefined, source: IDataSource,
    pattern: RDF.BaseQuad | undefined, lastMetadata?: Record<string, any>): void {
    if (this.skipEmptyPatterns && !md && pattern && !this.isSourceEmpty(source, pattern)) {
      this.emptyPatterns.get(source)!.push(pattern);
    }
  }

  public match(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): AsyncIterator<RDF.Quad> {
    let it = new AsyncIterator<RDF.Quad>();

    const collectedSourceMetadata: Record<string, any>[] = [];
    let nMetadataObjects = 0;
    let nMetadataObjectsReduced = 0;
    type IReducer = (action: IActionRdfMetadataAggregate) => Promise<Record<string, any>>;
    // Anonymous function that will set the metadata property on the AsyncIterator.
    const emitFinalMetadata = (): void => {
      const finalMetadata = collectedSourceMetadata.pop();
      it.setProperty('metadata', finalMetadata);
    };
    // Anonymous function for reducing the metadata collected from the sources.
    const reduce = (reducer: IReducer, last: boolean): void => {
      if (collectedSourceMetadata.length >= 2) {
        // Push reduced result back onto the collected source metadata array
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        reducer({ metadata: collectedSourceMetadata.pop()!, subMetadata: collectedSourceMetadata.pop()! })
          .then(({ aggregatedMetadata }) => {
            collectedSourceMetadata.push(aggregatedMetadata);
            nMetadataObjectsReduced += 2;

            if (nMetadataObjectsReduced === nMetadataObjects) {
              emitFinalMetadata();
            }
          });
      } else if (last) {
        emitFinalMetadata();
      }
    };

    const proxyIt: Promise<AsyncIterator<RDF.Quad>[]> = Promise.all(this.sources.map(async(source, i) => {
      const sourceId = this.getSourceId(source);
      // Deskolemize terms, so we send the original blank nodes to each source.
      // Note that some sources may not match bnodes by label. SPARQL endpoints for example consider them variables.
      const patternS = FederatedQuadSource.deskolemizeTerm(subject, sourceId);
      const patternP = FederatedQuadSource.deskolemizeTerm(predicate, sourceId);
      const patternO = FederatedQuadSource.deskolemizeTerm(object, sourceId);
      const patternG = FederatedQuadSource.deskolemizeTerm(graph, sourceId);
      let pattern: Algebra.Pattern | undefined;

      // Prepare the context for this specific source
      let context: ActionContext = getDataSourceContext(source, this.contextDefault);
      context = context.set(KeysRdfResolveQuadPattern.source,
        { type: getDataSourceType(source), value: getDataSourceValue(source) });

      let output: IActorRdfResolveQuadPatternOutput;
      // If any of the deskolemized blank nodes originate from another source,
      // or if we can predict that the given source will have no bindings for the given pattern,
      // return an empty iterator.
      if (!patternS || !patternP || !patternO || !patternG ||
            // eslint-disable-next-line no-cond-assign
            this.isSourceEmpty(source, pattern = this.algebraFactory
              .createPattern(patternS, patternP, patternO, patternG))) {
        output = { data: new ArrayIterator([], { autoStart: false }) };
        this.checkPushEmptyPattern({ totalItems: 0 }, source, pattern);
      } else {
        output = await this.mediatorResolveQuadPattern.mediate({ pattern, context });
      }
      // Get the metadata property from the output data, if any.
      const outputMetadata: Record<string, any> | undefined = output.data.getProperty('metadata');

      const metadataIndicatesEmpty = outputMetadata !== undefined &&
            outputMetadata.totalItems !== undefined &&
            outputMetadata.totalItems === 0;

      if (metadataIndicatesEmpty) {
        this.checkPushEmptyPattern(undefined, source, pattern);
      }

      // If the output contains metadata, collect & reduce.
      if (outputMetadata) {
        nMetadataObjects++;
        collectedSourceMetadata.push(outputMetadata);
        const myReducer: IReducer = action => this.mediatorAggregate.mediate(action);
        const last = i === this.sources.length - 1;
        reduce(myReducer, last);
      } else {
        emitFinalMetadata();
      }

      // Determine the data stream from this source
      let data = output.data.map(quad => FederatedQuadSource.skolemizeQuad(quad, sourceId));
      // SPARQL query semantics allow graph variables to only match with named graphs, excluding the default graph
      if (graph.termType === 'Variable') {
        data = data.filter(quad => quad.graph.termType !== 'DefaultGraph');
      }

      // Forward errors to our final iterator
      data.on('error', error => it.emit('error', error));

      return data;
    }));

    // Take the union of all source streams
    it = new TransformIterator(async() => new UnionIterator(await proxyIt), { autoStart: false });

    // If we have 0 sources, immediately emit metadata
    if (this.sources.length === 0) {
      collectedSourceMetadata.push({ totalItems: 0 });
      emitFinalMetadata();
    }

    return it;
  }
}
