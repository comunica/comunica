import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorDereferenceRdfOutput, MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type { MediatorQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import type { IActorRdfMetadataOutput, MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { ILink, MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysQuerySourceIdentify } from '@comunica/context-entries';
import type {
  BindingsStream,
  FragmentSelectorShape,
  IActionContext,
  IAggregatedStore,
  IQueryBindingsOptions,
  IQuerySource,
  MetadataBindings,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { TransformIterator } from 'asynciterator';
import { LRUCache } from 'lru-cache';
import { Readable } from 'readable-stream';
import type { Algebra } from 'sparqlalgebrajs';
import type { ISourceState } from './LinkedRdfSourcesAsyncRdfIterator';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from './MediatedLinkedRdfSourcesAsyncRdfIterator';
import { StreamingStoreMetadata } from './StreamingStoreMetadata';

export class QuerySourceHypermedia implements IQuerySource {
  public readonly referenceValue: string;
  public readonly firstUrl: string;
  public readonly forceSourceType?: string;
  public readonly aggregateStore: boolean;
  public readonly mediators: IMediatorArgs;
  public readonly logWarning: (warningMessage: string) => void;
  public readonly bindingsFactory: BindingsFactory;

  /**
   * A cache for source URLs to source states.
   */
  public sourcesState: LRUCache<string, Promise<ISourceState>>;

  private readonly cacheSize: number;
  private readonly maxIterators: number;

  public constructor(
    cacheSize: number,
    firstUrl: string,
    forceSourceType: string | undefined,
    maxIterators: number,
    aggregateStore: boolean,
    mediators: IMediatorArgs,
    logWarning: (warningMessage: string) => void,
    bindingsFactory: BindingsFactory,
  ) {
    this.referenceValue = firstUrl;
    this.cacheSize = cacheSize;
    this.firstUrl = firstUrl;
    this.forceSourceType = forceSourceType;
    this.maxIterators = maxIterators;
    this.mediators = mediators;
    this.aggregateStore = aggregateStore;
    this.logWarning = logWarning;
    this.bindingsFactory = bindingsFactory;
    this.sourcesState = new LRUCache<string, Promise<ISourceState>>({ max: this.cacheSize });
  }

  public async getSelectorShape(context: IActionContext): Promise<FragmentSelectorShape> {
    const source = await this.getSourceCached({ url: this.firstUrl }, {}, context, this.getAggregateStore(context));
    return source.source.getSelectorShape(context);
  }

  public queryBindings(
    operation: Algebra.Operation,
    context: IActionContext,
    options?: IQueryBindingsOptions,
  ): BindingsStream {
    // Optimized match with aggregated store if enabled and started.
    const aggregatedStore: IAggregatedStore | undefined = this.getAggregateStore(context);
    if (aggregatedStore && operation.type === 'pattern' && aggregatedStore.started) {
      return new QuerySourceRdfJs(aggregatedStore, this.bindingsFactory).queryBindings(operation, context);
    }

    // Initialize the sources state on first call
    if (this.sourcesState.size === 0) {
      this.getSourceCached({ url: this.firstUrl }, {}, context, aggregatedStore)
        .catch(error => it.destroy(error));
    }

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
   * @param aggregatedStore An optional aggregated store.
   */
  public async getSource(
    link: ILink,
    handledDatasets: Record<string, boolean>,
    context: IActionContext,
    aggregatedStore: IAggregatedStore | undefined,
  ): Promise<ISourceState> {
    // Include context entries from link
    if (link.context) {
      context = context.merge(link.context);
    }

    // Get the RDF representation of the given document
    let url = link.url;
    let quads: RDF.Stream;
    let metadata: Record<string, any>;
    try {
      const dereferenceRdfOutput: IActorDereferenceRdfOutput = await this.mediators.mediatorDereferenceRdf
        .mediate({ context, url });
      url = dereferenceRdfOutput.url;

      // Determine the metadata
      const rdfMetadataOutput: IActorRdfMetadataOutput = await this.mediators.mediatorMetadata.mediate(
        { context, url, quads: dereferenceRdfOutput.data, triples: dereferenceRdfOutput.metadata?.triples },
      );

      rdfMetadataOutput.data.on('error', () => {
        // Silence errors in the data stream,
        // as they will be emitted again in the metadata stream,
        // and will result in a promise rejection anyways.
        // If we don't do this, we end up with an unhandled error message
      });

      metadata = (await this.mediators.mediatorMetadataExtract.mediate({
        context,
        url,
        // The problem appears to be conflicting metadata keys here
        metadata: rdfMetadataOutput.metadata,
        headers: dereferenceRdfOutput.headers,
        requestTime: dereferenceRdfOutput.requestTime,
      })).metadata;
      quads = rdfMetadataOutput.data;

      // Optionally filter the resulting data
      if (link.transform) {
        quads = await link.transform(quads);
      }
    } catch (error: unknown) {
      // Make sure that dereference errors are only emitted once an actor really needs the read quads
      // This for example allows SPARQL endpoints that error on service description fetching to still be source-forcible
      quads = new Readable();
      quads.read = () => {
        setTimeout(() => quads.emit('error', error));
        return null;
      };
      ({ metadata } = await this.mediators.mediatorMetadataAccumulate.mediate({ context, mode: 'initialize' }));

      // Log as warning, because the quads above may not always be consumed (e.g. for SPARQL endpoints),
      // so the user would not be notified of something going wrong otherwise.
      this.logWarning(`Metadata extraction for ${url} failed: ${(<Error> error).message}`);
    }

    // Aggregate all discovered quads into a store.
    aggregatedStore?.setBaseMetadata(<MetadataBindings> metadata, false);
    aggregatedStore?.containedSources.add(link.url);
    aggregatedStore?.import(quads);

    // Determine the source
    const { source, dataset } = await this.mediators.mediatorQuerySourceIdentifyHypermedia.mediate({
      context,
      forceSourceType: link.url === this.firstUrl ? this.forceSourceType : undefined,
      handledDatasets,
      metadata,
      quads,
      url,
    });

    if (dataset) {
      // Mark the dataset as applied
      // This is needed to make sure that things like QPF search forms are only applied once,
      // and next page links are followed after that.
      handledDatasets[dataset] = true;
    }

    return { link, source, metadata: <MetadataBindings> metadata, handledDatasets };
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
    source = this.getSource(link, handledDatasets, context, aggregatedStore);
    if (link.url === this.firstUrl || aggregatedStore === undefined) {
      this.sourcesState.set(link.url, source);
    }
    return source;
  }

  public getAggregateStore(context: IActionContext): IAggregatedStore | undefined {
    let aggregatedStore: IAggregatedStore | undefined;
    if (this.aggregateStore) {
      const aggregatedStores: Map<string, IAggregatedStore> | undefined = context
        .get(KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores);
      if (aggregatedStores) {
        aggregatedStore = aggregatedStores.get(this.firstUrl);
        if (!aggregatedStore) {
          aggregatedStore = new StreamingStoreMetadata(
            undefined,
            async(accumulatedMetadata, appendingMetadata) => <MetadataBindings>
              (await this.mediators.mediatorMetadataAccumulate.mediate({
                mode: 'append',
                accumulatedMetadata,
                appendingMetadata,
                context,
              })).metadata,
          );
          aggregatedStores.set(this.firstUrl, aggregatedStore);
        }
        return aggregatedStore;
      }
    }
  }

  public toString(): string {
    return `QuerySourceHypermedia(${this.firstUrl})`;
  }
}

export interface IMediatorArgs {
  mediatorDereferenceRdf: MediatorDereferenceRdf;
  mediatorMetadata: MediatorRdfMetadata;
  mediatorMetadataExtract: MediatorRdfMetadataExtract;
  mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;
  mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
}
