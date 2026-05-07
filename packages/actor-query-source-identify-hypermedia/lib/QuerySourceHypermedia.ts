import type { MediatorQuerySourceDereferenceLink } from '@comunica/bus-query-source-dereference-link';
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

/**
 * A query source that follows hypermedia links to resolve queries across linked RDF sources.
 * It caches resolved sources and delegates query execution to the underlying sources.
 */
export class QuerySourceHypermedia implements IQuerySource {
  /** The URL string used as reference value for this source. */
  public readonly referenceValue: string;
  /** The initial link used to seed source discovery. */
  public readonly firstLink: ILink;
  /** The mediators used for metadata accumulation, source dereferencing, and link resolution. */
  public readonly mediators: IMediatorArgs;
  /** The RDF data factory used to create RDF terms. */
  public readonly dataFactory: ComunicaDataFactory;
  /** The factory for creating bindings instances. */
  public readonly bindingsFactory: BindingsFactory;

  /**
   * A cache for source URLs to source states.
   */
  public sourcesState: LRUCache<string, Promise<ISourceState>>;

  /** Maximum number of entries in the LRU source cache. */
  private readonly cacheSize: number;
  /** Maximum number of links that can be followed in parallel. */
  private readonly maxIterators: number;

  /**
   * Creates a new hypermedia query source.
   * @param cacheSize Maximum number of entries in the LRU source cache.
   * @param firstUrl The initial link to start source discovery from.
   * @param maxIterators Maximum number of links that can be followed in parallel.
   * @param mediators The mediators for metadata, dereferencing, and link resolution.
   * @param dataFactory The RDF data factory.
   * @param bindingsFactory The bindings factory.
   */
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

  /**
   * Delegates selector shape retrieval to the cached first source.
   * @param context The action context.
   * @return The fragment selector shape supported by this source.
   */
  public async getSelectorShape(context: IActionContext): Promise<FragmentSelectorShape> {
    const source = await this.getSourceCached(this.firstLink, {}, context);
    return source.source.getSelectorShape(context);
  }

  /**
   * Delegates filter factor retrieval to the cached first source.
   * @param context The action context.
   * @return The filter factor indicating source selectivity.
   */
  public async getFilterFactor(context: IActionContext): Promise<number> {
    const source = await this.getSourceCached(this.firstLink, {}, context);
    return source.source.getFilterFactor(context);
  }

  /**
   * Creates a {@link MediatedLinkedRdfSourcesAsyncRdfIterator} that lazily follows
   * hypermedia links to produce bindings.
   * @param operation The algebra operation to evaluate.
   * @param context The action context.
   * @param options Optional bindings query options.
   * @return A bindings stream that iterates across linked RDF sources.
   */
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

  /**
   * Delegates quad pattern query execution to the cached first source.
   * @param operation The algebra operation to evaluate.
   * @param context The action context.
   * @return An async iterator over matching quads.
   */
  public queryQuads(operation: Algebra.Operation, context: IActionContext): AsyncIterator<RDF.Quad> {
    return new TransformIterator(async() => {
      const source = await this.getSourceCached(this.firstLink, {}, context);
      return source.source.queryQuads(operation, context);
    }, { autoStart: false });
  }

  /**
   * Delegates a boolean (ASK) query to the cached first source.
   * @param operation The ASK algebra operation to evaluate.
   * @param context The action context.
   * @return The boolean result of the ASK query.
   */
  public async queryBoolean(operation: Algebra.Ask, context: IActionContext): Promise<boolean> {
    const source = await this.getSourceCached(this.firstLink, {}, context);
    return await source.source.queryBoolean(operation, context);
  }

  /**
   * Delegates a void (update) operation to the cached first source.
   * @param operation The algebra operation to evaluate.
   * @param context The action context.
   */
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
    const { source, metadata, cachePolicy } = await this.mediators.mediatorQuerySourceDereferenceLink.mediate({
      link,
      handledDatasets,
      context,
    });

    return { link, source, metadata, handledDatasets, cachePolicy };
  }

  /**
   * Resolve a source for the given URL.
   * This will first try to retrieve the source from cache.
   * @param link A source ILink.
   * @param handledDatasets A hash of dataset identifiers that have already been handled.
   * @param context The action context.
   */
  public getSourceCached(
    link: ILink,
    handledDatasets: Record<string, boolean>,
    context: IActionContext,
  ): Promise<ISourceState> {
    let source = this.sourcesState.get(link.url);
    if (source) {
      return (async() => {
        // Check if cache policy is still valid
        const sourceMaterialized = await source;
        if (sourceMaterialized.cachePolicy &&
          !await sourceMaterialized.cachePolicy?.satisfiesWithoutRevalidation({ link, context })) {
          // If it's not valid, delete cache entry, and re-fetch immediately
          // LIMITATION: we're not sending re-validation requests. So if the server sends a 304, we will perform a new
          // request and re-index the source. If an HTTP-level cache is active, the actual HTTP request will not be
          // sent, so only local re-indexing will happen, which is negligible in most cases.
          this.sourcesState.delete(link.url);
          return this.getSourceCached(link, handledDatasets, context);
        }
        return sourceMaterialized;
      })();
    }
    source = this.getSource(link, handledDatasets, context);
    this.sourcesState.set(link.url, source);
    return source;
  }

  /**
   * Returns a string representation of this hypermedia query source.
   * @return A string in the form `QuerySourceHypermedia(url)`.
   */
  public toString(): string {
    return `QuerySourceHypermedia(${this.firstLink.url})`;
  }
}

/**
 * Holds the mediators required by {@link QuerySourceHypermedia} for source resolution and metadata handling.
 */
export interface IMediatorArgs {
  mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  mediatorQuerySourceDereferenceLink: MediatorQuerySourceDereferenceLink;
  mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
}
