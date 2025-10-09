import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { MediatorQuerySourceHypermediaResolve } from '@comunica/bus-query-source-hypermedia-resolve';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysInitQuery } from '@comunica/context-entries';
import type {
  BindingsStream,
  ComunicaDataFactory,
  FragmentSelectorShape,
  IActionContext,
  IAggregatedStore,
  IQueryBindingsOptions,
  IQuerySource,
  ILink,
} from '@comunica/types';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { TransformIterator } from 'asynciterator';
import { LRUCache } from 'lru-cache';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import type { ISourceState } from './LinkedRdfSourcesAsyncRdfIterator';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from './MediatedLinkedRdfSourcesAsyncRdfIterator';

export class QuerySourceHypermedia implements IQuerySource {
  public readonly referenceValue: string;
  public readonly firstUrl: string;
  public readonly forceSourceType?: string;
  public readonly aggregateStore: boolean;
  public readonly mediators: IMediatorArgs;
  public readonly logWarning: (warningMessage: string) => void;
  public readonly dataFactory: ComunicaDataFactory;
  public readonly bindingsFactory: BindingsFactory;

  /**
   * A cache for source URLs to source states.
   */
  public sourcesState: LRUCache<string, Promise<ISourceState>>;

  private readonly cacheSize: number;
  private readonly maxIterators: number;

  private readonly emitPartialCardinalities: boolean;

  public constructor(
    cacheSize: number,
    firstUrl: string,
    forceSourceType: string | undefined,
    maxIterators: number,
    aggregateStore: boolean, // TODO: rm all aggregateStore stuff
    emitPartialCardinalities: boolean,
    mediators: IMediatorArgs,
    logWarning: (warningMessage: string) => void,
    dataFactory: ComunicaDataFactory,
    bindingsFactory: BindingsFactory,

  ) {
    this.referenceValue = firstUrl;
    this.cacheSize = cacheSize;
    this.firstUrl = firstUrl;
    this.forceSourceType = forceSourceType;
    this.maxIterators = maxIterators;
    this.mediators = mediators;
    this.aggregateStore = aggregateStore;
    this.emitPartialCardinalities = emitPartialCardinalities;
    this.logWarning = logWarning;
    this.dataFactory = dataFactory;
    this.bindingsFactory = bindingsFactory;
    this.sourcesState = new LRUCache<string, Promise<ISourceState>>({ max: this.cacheSize });
  }

  public async getSelectorShape(context: IActionContext): Promise<FragmentSelectorShape> {
    const source = await this.getSourceCached({ url: this.firstUrl }, {}, context, this.getAggregateStore(context));
    return source.source.getSelectorShape(context);
  }

  public async getFilterFactor(context: IActionContext): Promise<number> {
    const source = await this.getSourceCached({ url: this.firstUrl }, {}, context, this.getAggregateStore(context));
    return source.source.getFilterFactor(context);
  }

  public queryBindings(
    operation: Algebra.Operation,
    context: IActionContext,
    options?: IQueryBindingsOptions,
  ): BindingsStream {
    // Optimized match with aggregated store if enabled and started.
    const aggregatedStore: IAggregatedStore | undefined = this.getAggregateStore(context);
    if (aggregatedStore && operation.type === 'pattern' && aggregatedStore.started) {
      return new QuerySourceRdfJs(
        aggregatedStore,
        context.getSafe(KeysInitQuery.dataFactory),
        this.bindingsFactory,
      ).queryBindings(operation, context);
    }

    // Initialize the sources state on first call
    if (this.sourcesState.size === 0) {
      this.getSourceCached({ url: this.firstUrl }, {}, context, aggregatedStore)
        .catch(error => it.destroy(error));
    }

    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);
    const it: MediatedLinkedRdfSourcesAsyncRdfIterator = new MediatedLinkedRdfSourcesAsyncRdfIterator(
      this.cacheSize,
      operation,
      options,
      context,
      this.forceSourceType,
      this.firstUrl,
      this.maxIterators,
      (link, handledDatasets) => this.getSourceCached(link, handledDatasets, context, aggregatedStore),
      aggregatedStore,
      this.mediators.mediatorMetadataAccumulate,
      this.mediators.mediatorRdfResolveHypermediaLinks,
      this.mediators.mediatorRdfResolveHypermediaLinksQueue,
      dataFactory,
      algebraFactory,
    );
    if (aggregatedStore) {
      aggregatedStore.started = true;

      // Kickstart this iterator when derived iterators are created from the aggregatedStore,
      // otherwise the traversal process will not start if this iterator is not the first one to be consumed.
      const listener = (): void => it.kickstart();
      aggregatedStore.addIteratorCreatedListener(listener);
      it.on('end', () => aggregatedStore.removeIteratorCreatedListener(listener));
    }

    return it;
  }

  public queryQuads(operation: Algebra.Operation, context: IActionContext): AsyncIterator<RDF.Quad> {
    return new TransformIterator(async() => {
      const source = await this.getSourceCached({ url: this.firstUrl }, {}, context, this.getAggregateStore(context));
      return source.source.queryQuads(operation, context);
    });
  }

  public async queryBoolean(operation: Algebra.Ask, context: IActionContext): Promise<boolean> {
    const source = await this.getSourceCached({ url: this.firstUrl }, {}, context, this.getAggregateStore(context));
    return await source.source.queryBoolean(operation, context);
  }

  public async queryVoid(operation: Algebra.Update, context: IActionContext): Promise<void> {
    const source = await this.getSourceCached({ url: this.firstUrl }, {}, context, this.getAggregateStore(context));
    return await source.source.queryVoid(operation, context);
  }

  /**
   * Resolve a source for the given URL.
   * @param link A source link.
   * @param handledDatasets A hash of dataset identifiers that have already been handled.
   * @param context The action context.
   */
  public async getSource(
    link: ILink,
    handledDatasets: Record<string, boolean>,
    context: IActionContext,
  ): Promise<ISourceState> {
    // Include context entries from link
    if (link.context) {
      context = context.merge(link.context);
    }

    const { source, metadata } = await this.mediators.mediatorQuerySourceHypermediaResolve.mediate({
      url: link.url,
      forceSourceType: link.forceSourceType,
      handledDatasets,
      transformQuads: link.transform,
      context,
    });

    return { link, source, metadata, handledDatasets };
  }

  /**
   * Resolve a source for the given URL.
   * This will first try to retrieve the source from cache.
   * @param link A source ILink.
   * @param handledDatasets A hash of dataset identifiers that have already been handled.
   * @param context The action context.
   * @param aggregatedStore An optional aggregated store.
   */
  protected getSourceCached(
    link: ILink,
    handledDatasets: Record<string, boolean>,
    context: IActionContext,
    aggregatedStore: IAggregatedStore | undefined,
  ): Promise<ISourceState> {
    let source = this.sourcesState.get(link.url);
    if (source) {
      return source;
    }
    source = this.getSource(link, handledDatasets, context);
    if (link.url === this.firstUrl || aggregatedStore === undefined) {
      this.sourcesState.set(link.url, source);
    }
    return source;
  }

  public getAggregateStore(_context: IActionContext): IAggregatedStore | undefined {
    // TODO: rm
    // let aggregatedStore: IAggregatedStore | undefined;
    // if (this.aggregateStore) {
    //   const aggregatedStores: Map<string, IAggregatedStore> | undefined = context
    //     .get(KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores);
    //   if (aggregatedStores) {
    //     aggregatedStore = aggregatedStores.get(this.firstUrl);
    //     if (!aggregatedStore) {
    //       aggregatedStore = new AggregatedStoreMemory(
    //         undefined,
    //         async(accumulatedMetadata, appendingMetadata) => <MetadataBindings>
    //           (await this.mediators.mediatorMetadataAccumulate.mediate({
    //             mode: 'append',
    //             accumulatedMetadata,
    //             appendingMetadata,
    //             context,
    //           })).metadata,
    //         this.emitPartialCardinalities,
    //       );
    //       aggregatedStores.set(this.firstUrl, aggregatedStore);
    //     }
    //     return aggregatedStore;
    //   }
    // }
    return undefined;
  }

  public toString(): string {
    return `QuerySourceHypermedia(${this.firstUrl})`;
  }
}

export interface IMediatorArgs {
  mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  mediatorQuerySourceHypermediaResolve: MediatorQuerySourceHypermediaResolve;
  mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
}
