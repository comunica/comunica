import type { MediatorQuerySourceHypermediaResolve } from '@comunica/bus-query-source-hypermedia-resolve';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type {
  BindingsStream,
  ComunicaDataFactory,
  FragmentSelectorShape,
  IActionContext,
  IQueryBindingsOptions,
  IQuerySource,
  ILink,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { TransformIterator } from 'asynciterator';
import { LRUCache } from 'lru-cache';
import type { ISourceState } from './LinkedRdfSourcesAsyncRdfIterator';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from './MediatedLinkedRdfSourcesAsyncRdfIterator';

export class QuerySourceHypermedia implements IQuerySource {
  public readonly referenceValue: string;
  public readonly firstLink: ILink;
  public readonly mediators: IMediatorArgs;
  public readonly dataFactory: ComunicaDataFactory;
  public readonly bindingsFactory: BindingsFactory;

  /**
   * A cache for source URLs to source states.
   */
  public sourcesState: LRUCache<string, Promise<ISourceState>>;

  private readonly cacheSize: number;
  private readonly maxIterators: number;

  public constructor(
    cacheSize: number,
    firstUrl: ILink,
    maxIterators: number,
    mediators: IMediatorArgs,
    dataFactory: ComunicaDataFactory,
    bindingsFactory: BindingsFactory,
  ) {
    this.referenceValue = firstUrl.url;
    this.cacheSize = cacheSize;
    this.firstLink = firstUrl;
    this.maxIterators = maxIterators;
    this.mediators = mediators;
    this.dataFactory = dataFactory;
    this.bindingsFactory = bindingsFactory;
    this.sourcesState = new LRUCache<string, Promise<ISourceState>>({ max: this.cacheSize });
  }

  public async getSelectorShape(context: IActionContext): Promise<FragmentSelectorShape> {
    const source = await this.getSourceCached(this.firstLink, {}, context);
    return source.source.getSelectorShape(context);
  }

  public async getFilterFactor(context: IActionContext): Promise<number> {
    const source = await this.getSourceCached(this.firstLink, {}, context);
    return source.source.getFilterFactor(context);
  }

  public queryBindings(
    operation: Algebra.Operation,
    context: IActionContext,
    options?: IQueryBindingsOptions,
  ): BindingsStream {
    // Initialize the sources state on first call
    if (this.sourcesState.size === 0) {
      this.getSourceCached(this.firstLink, {}, context)
        .catch(error => it.destroy(error));
    }

    const it: MediatedLinkedRdfSourcesAsyncRdfIterator = new MediatedLinkedRdfSourcesAsyncRdfIterator(
      operation,
      options,
      context,
      this.firstLink,
      this.maxIterators,
      (link, handledDatasets) => this.getSourceCached(link, handledDatasets, context),
      this.mediators.mediatorMetadataAccumulate,
      this.mediators.mediatorRdfResolveHypermediaLinks,
      this.mediators.mediatorRdfResolveHypermediaLinksQueue,
    );

    return it;
  }

  public queryQuads(operation: Algebra.Operation, context: IActionContext): AsyncIterator<RDF.Quad> {
    return new TransformIterator(async() => {
      const source = await this.getSourceCached(this.firstLink, {}, context);
      return source.source.queryQuads(operation, context);
    });
  }

  public async queryBoolean(operation: Algebra.Ask, context: IActionContext): Promise<boolean> {
    const source = await this.getSourceCached(this.firstLink, {}, context);
    return await source.source.queryBoolean(operation, context);
  }

  public async queryVoid(operation: Algebra.Operation, context: IActionContext): Promise<void> {
    const source = await this.getSourceCached(this.firstLink, {}, context);
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
   */
  protected getSourceCached(
    link: ILink,
    handledDatasets: Record<string, boolean>,
    context: IActionContext,
  ): Promise<ISourceState> {
    let source = this.sourcesState.get(link.url);
    if (source) {
      return source;
    }
    source = this.getSource(link, handledDatasets, context);
    this.sourcesState.set(link.url, source);
    return source;
  }

  public toString(): string {
    return `QuerySourceHypermedia(${this.firstLink.url})`;
  }
}

export interface IMediatorArgs {
  mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  mediatorQuerySourceHypermediaResolve: MediatorQuerySourceHypermediaResolve;
  mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
}
