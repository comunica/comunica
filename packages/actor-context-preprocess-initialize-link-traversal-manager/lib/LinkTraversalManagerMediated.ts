import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { MediatorQuerySourceHypermediaResolve } from '@comunica/bus-query-source-hypermedia-resolve';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import { KeysInitQuery, KeysStatistics } from '@comunica/context-entries';
import type {
  ComunicaDataFactory,
  IActionContext,
  IAggregatedStore,
  IDiscoverEventData,
  ILink,
  ILinkQueue,
  ILinkTraversalManager,
  IQuerySource,
  IStatisticBase,
} from '@comunica/types';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import type { AsyncIterator } from 'asynciterator';
import type { AsyncReiterable } from 'asyncreiterable';
import { AsyncReiterableArray } from 'asyncreiterable';
import { Factory } from 'sparqlalgebrajs';

export class LinkTraversalManagerMediated implements ILinkTraversalManager {
  protected running = false;
  protected readonly handledUrls: Record<string, boolean> = {};
  protected linksDereferencing = 0;
  protected querySourceAggregated: IQuerySource;
  protected querySourcesNonAggregated: AsyncReiterable<IQuerySource>;
  protected rejectionHandler: ((error: Error) => void) | undefined;
  protected readonly endListeners: (() => void)[];

  public constructor(
    protected readonly linkParallelization: number,
    public readonly seeds: ILink[],
    public readonly linkQueue: ILinkQueue,
    public readonly aggregatedStore: IAggregatedStore,
    protected readonly context: IActionContext,
    protected readonly dataFactory: ComunicaDataFactory,
    protected readonly bindingsFactory: BindingsFactory,
    protected readonly mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks,
    protected readonly mediatorQuerySourceHypermediaResolve: MediatorQuerySourceHypermediaResolve,
  ) {
    this.querySourceAggregated = new QuerySourceRdfJs(
      this.aggregatedStore,
      this.dataFactory,
      this.bindingsFactory,
    );
    this.querySourcesNonAggregated = AsyncReiterableArray.fromInitialEmpty();
  }

  public get started(): boolean {
    return this.running;
  }

  public start(rejectionHandler: (error: Error) => void): void {
    if (this.started) {
      throw new Error('Tried to start link traversal manager more than once');
    }

    // Prepare link queue iteration
    this.rejectionHandler = rejectionHandler;
    this.running = true;
    for (const link of this.seeds) {
      this.linkQueue.push(link);
    }

    // Stop link queue iteration when all iterators from the aggregated store are closed.
    const allIteratorsClosedListener = (): void => {
      this.stop();
      this.aggregatedStore.removeAllIteratorsClosedListener(allIteratorsClosedListener);
    };
    this.aggregatedStore.addAllIteratorsClosedListener(allIteratorsClosedListener);

    // Kickstart continuous iteration over the link queue
    this.tryTraversingNextLinks();
  }

  public stop(): void {
    this.running = false;
    for (const cb of this.endListeners) {
      cb();
    }
  }

  public getQuerySourceAggregated(): IQuerySource {
    return this.querySourceAggregated;
  }

  public getQuerySourcesNonAggregated(): AsyncIterator<IQuerySource> {
    return this.querySourcesNonAggregated.iterator();
  }

  public addEndListener(cb: () => void): void {
    this.endListeners.push(cb);
  }

  protected tryTraversingNextLinks(): void {
    // Stop traversal if needed
    if (!this.running) {
      if (this.linksDereferencing === 0) {
        this.querySourcesNonAggregated.push(null);
        this.aggregatedStore.end();
      }
      return;
    }

    // Traverse multiple links in parallel
    while (this.linksDereferencing < this.linkParallelization) {
      const nextLink = this.linkQueue.pop();
      if (nextLink) {
        this.followLink(nextLink);
      } else {
        break;
      }
    }

    // If there are no further links to be traversed, we terminate
    if (this.linksDereferencing === 0 && this.linkQueue.isEmpty()) {
      this.stop();
    }
  }

  protected async getSourceLinks(metadata: Record<string, any>, startLink: ILink): Promise<ILink[]> {
    const { links } = await this.mediatorRdfResolveHypermediaLinks.mediate({ context: this.context, metadata });

    // Update discovery event statistic if available
    const traversalTracker: IStatisticBase<IDiscoverEventData> | undefined =
      this.context.get(KeysStatistics.discoveredLinks);
    if (traversalTracker) {
      for (const link of links) {
        traversalTracker.updateStatistic({ url: link.url, metadata: { ...link.metadata }}, startLink);
      }
    }

    // Filter URLs to avoid cyclic link loops
    return links.filter((link) => {
      if (this.handledUrls[link.url]) {
        return false;
      }
      this.handledUrls[link.url] = true;
      return true;
    });
  }

  protected followLink(nextLink: ILink): void {
    this.linksDereferencing++;
    const context = nextLink.context ? this.context.merge(nextLink.context) : this.context;

    this.mediatorQuerySourceHypermediaResolve.mediate({
      url: nextLink.url,
      forceSourceType: nextLink.forceSourceType,
      transformQuads: nextLink.transform,
      context,
    })
      .then(async({ source, metadata }) => {
        // Determine next links
        for (const link of await this.getSourceLinks(metadata, nextLink)) {
          this.linkQueue.push(link);
        }

        // If the source is a document, add to aggregate store.
        // Otherwise, append to non-document sources.
        if (await source.getFilterFactor(context) === 0) {
          this.aggregatedStore.setBaseMetadata(metadata, this.aggregatedStore.containedSources.size > 0);
          this.aggregatedStore.importSource(nextLink.url, source, context);
        } else {
          this.querySourcesNonAggregated.push(source);
        }

        // Queue next iteration
        this.linksDereferencing--;
        setTimeout(() => this.tryTraversingNextLinks());
      })
      .catch((error) => {
        this.linksDereferencing--;
        if (this.rejectionHandler) {
          this.rejectionHandler(error);
        } else {
          throw error;
        }
        this.stop();
      });
  }
}
