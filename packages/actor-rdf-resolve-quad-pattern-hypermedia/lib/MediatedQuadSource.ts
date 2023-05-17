import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import type { IActionContext, IAggregatedStore, IDataSource } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { ISourcesState } from './LinkedRdfSourcesAsyncRdfIterator';
import type { IMediatorArgs } from './MediatedLinkedRdfSourcesAsyncRdfIterator';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from './MediatedLinkedRdfSourcesAsyncRdfIterator';
import { StreamingStoreMetadata } from './StreamingStoreMetadata';

/**
 * A lazy quad source that creates {@link MediatedLinkedRdfSourcesAsyncRdfIterator} instances when matching quads.
 *
 * @see MediatedLinkedRdfSourcesAsyncRdfIterator
 */
export class MediatedQuadSource implements IQuadSource {
  public readonly firstUrl: string;
  public readonly forceSourceType?: string;
  public readonly mediators: IMediatorArgs;

  public sourcesState: ISourcesState;
  public aggregateStore: boolean;

  private readonly cacheSize: number;
  private readonly maxIterators: number;

  public constructor(cacheSize: number, firstUrl: string,
    forceSourceType: string | undefined, maxIterators: number, aggregateStore: boolean, mediators: IMediatorArgs) {
    this.cacheSize = cacheSize;
    this.firstUrl = firstUrl;
    this.forceSourceType = forceSourceType;
    this.maxIterators = maxIterators;
    this.aggregateStore = aggregateStore;
    this.mediators = mediators;
  }

  public static nullifyVariables(term?: RDF.Term): RDF.Term | undefined {
    return !term || term.termType === 'Variable' ? undefined : term;
  }

  public match(
    subject: RDF.Term,
    predicate: RDF.Term,
    object: RDF.Term,
    graph: RDF.Term,
    context: IActionContext,
  ): AsyncIterator<RDF.Quad> {
    // Optimized match with aggregated store if enabled and started.
    let aggregatedStore: IAggregatedStore | undefined;
    if (this.aggregateStore) {
      const aggregatedStores: Map<IDataSource, IAggregatedStore> | undefined = context
        .get(KeysRdfResolveQuadPattern.hypermediaSourcesAggregatedStores);
      if (aggregatedStores) {
        aggregatedStore = aggregatedStores.get(this.firstUrl);
        if (!aggregatedStore) {
          aggregatedStore = new StreamingStoreMetadata(
            undefined,
            (acc, app) => it.accumulateMetadata(acc, app),
          );
          aggregatedStores.set(this.firstUrl, aggregatedStore);
        }
        if (aggregatedStore.started) {
          return aggregatedStore.match(
            MediatedQuadSource.nullifyVariables(subject),
            MediatedQuadSource.nullifyVariables(predicate),
            MediatedQuadSource.nullifyVariables(object),
            MediatedQuadSource.nullifyVariables(graph),
          );
        }
      }
    }

    const it: MediatedLinkedRdfSourcesAsyncRdfIterator = new MediatedLinkedRdfSourcesAsyncRdfIterator(
      this.cacheSize,
      context,
      this.forceSourceType,
      subject,
      predicate,
      object,
      graph,
      this.firstUrl,
      this.maxIterators,
      aggregatedStore,
      this.mediators,
    );
    if (!this.sourcesState) {
      it.setSourcesState();
      this.sourcesState = it.sourcesState!;
    } else {
      it.setSourcesState(this.sourcesState);
    }
    if (aggregatedStore) {
      aggregatedStore.started = true;
    }
    return it;
  }
}
