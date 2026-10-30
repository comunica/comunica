import type { MediatorQuerySourceDereferenceLink } from '@comunica/bus-query-source-dereference-link';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type {
  Bindings,
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
import { removeShapeFlag } from '@comunica/utils-query-operation';
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

  /**
   * The state of the first source, once it is known that no links can be followed from it.
   * Operations are then delegated to that source directly.
   */
  private directSourceState: ISourceState | undefined;
  private directSourceProbe: Promise<ISourceState | undefined> | undefined;
  private directContextIn: IActionContext | undefined;
  private directContextOut: IActionContext | undefined;

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
    const shape = await source.source.getSelectorShape(context);
    return await this.hasDirectSourceState(source, context) ? shape : removeShapeFlag(shape, 'synchronous');
  }

  /**
   * Check if operations can be delegated directly to the first source.
   * @param sourceState The current state of the first source.
   * @param context The action context.
   */
  protected async hasDirectSourceState(sourceState: ISourceState, context: IActionContext): Promise<boolean> {
    // A first source that was fetched again, e.g. because its cache policy expired, is probed again.
    if (this.directSourceProbe && await this.directSourceProbe !== sourceState) {
      this.directSourceState = undefined;
      this.directSourceProbe = undefined;
    }
    this.probeDirectSource(context);
    await this.directSourceProbe;
    return this.directSourceState !== undefined;
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
    if (this.directSourceState) {
      return this.directSourceState.source.queryBindings(operation, this.getDirectContext(context), options);
    }

    // Initialize the sources state on first call
    if (this.sourcesState.size === 0) {
      this.getSourceCached(this.firstLink, {}, context)
        .catch(error => it.destroy(error));
    }
    this.probeDirectSource(context);

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

  public queryBindingsSynchronous(operation: Algebra.Operation, context: IActionContext): Bindings[] | undefined {
    if (!this.directSourceState) {
      this.probeDirectSource(context);
      return undefined;
    }
    return this.directSourceState.source.queryBindingsSynchronous?.(operation, this.getDirectContext(context));
  }

  /**
   * Check, once, if operations can be delegated directly to the first source.
   * Its promise resolves to the probed state of the first source, if it could be fetched.
   * @param context The action context.
   */
  protected probeDirectSource(context: IActionContext): void {
    this.directSourceProbe ??= (async() => {
      try {
        const sourceState = await this.getSourceCached(this.firstLink, {}, context);
        if (await this.canDelegateTo(sourceState, context)) {
          this.directSourceState = sourceState;
        }
        return sourceState;
      } catch {
        // Sources that fail are handled by the regular path
      }
    })();
  }

  /**
   * Check if operations can be delegated directly to the given source.
   * This is the case if no links can be followed from it,
   * and if its metadata contains nothing that accumulating would change.
   * Its request time is not kept, as the source is only requested once.
   * @param sourceState The state of a source.
   * @param context The action context.
   */
  protected async canDelegateTo(sourceState: ISourceState, context: IActionContext): Promise<boolean> {
    const metadata: Record<string, any> = sourceState.metadata;
    if ('cardinality' in metadata || 'pageSize' in metadata) {
      return false;
    }
    // Shared with the link traversal iterators.
    sourceState.hasSourceLinks ??= this.mediators.mediatorRdfResolveHypermediaLinks.mediate({ context, metadata })
      .then(({ links }) => links.length > 0, () => false);
    return !await sourceState.hasSourceLinks;
  }

  /**
   * The context for querying the direct source, which includes the context of its link.
   * @param context The action context.
   */
  protected getDirectContext(context: IActionContext): IActionContext {
    const linkContext = this.directSourceState!.link.context;
    if (!linkContext) {
      return context;
    }
    if (this.directContextIn !== context) {
      this.directContextIn = context;
      this.directContextOut = context.merge(linkContext);
    }
    return this.directContextOut!;
  }

  public queryQuads(operation: Algebra.Operation, context: IActionContext): AsyncIterator<RDF.Quad> {
    return new TransformIterator(async() => {
      const source = await this.getSourceCached(this.firstLink, {}, context);
      return source.source.queryQuads(operation, context);
    }, { autoStart: false });
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
    const source = this.sourcesState.get(link.url);
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
    const sourcePromise = this.getSource(link, handledDatasets, context);
    this.sourcesState.set(link.url, sourcePromise);
    // Remove failed sources from the cache, so that later calls can retry them.
    // Without this, a source that (for example) did not exist yet at the time of the first request
    // would remain unavailable for the lifetime of this query source.
    sourcePromise.catch(() => {
      if (this.sourcesState.get(link.url) === sourcePromise) {
        this.sourcesState.delete(link.url);
      }
    });
    return sourcePromise;
  }

  public toString(): string {
    return `QuerySourceHypermedia(${this.firstLink.url})`;
  }
}

export interface IMediatorArgs {
  mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  mediatorQuerySourceDereferenceLink: MediatorQuerySourceDereferenceLink;
  mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
}
