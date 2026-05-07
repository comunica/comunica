import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysStatistics } from '@comunica/context-entries';
import type {
  IActionContext,
  IQueryBindingsOptions,
  MetadataBindings,
  ILink,
  IStatisticBase,
  IDiscoverEventData,
  ILinkQueue,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import type { SourceStateGetter, ISourceState } from './LinkedRdfSourcesAsyncRdfIterator';
import { LinkedRdfSourcesAsyncRdfIterator } from './LinkedRdfSourcesAsyncRdfIterator';

/**
 * A quad iterator that can iterate over consecutive RDF sources
 * that are determined using the rdf-resolve-hypermedia-links bus.
 *
 * @see LinkedRdfSourcesAsyncRdfIterator
 */
export class MediatedLinkedRdfSourcesAsyncRdfIterator extends LinkedRdfSourcesAsyncRdfIterator {
  /** Mediator for accumulating metadata across traversed sources. */
  private readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  /** Mediator for resolving hypermedia links from source metadata. */
  private readonly mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  /** Mediator for resolving a hypermedia links queue strategy. */
  private readonly mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
  /** Record of URLs that have already been handled to prevent cyclic traversal. */
  private readonly handledUrls: Record<string, boolean>;
  /** Lazily initialized promise for the link queue used during traversal. */
  private linkQueue: Promise<ILinkQueue> | undefined;

  /**
   * Creates a new mediated linked RDF sources async iterator.
   * @param operation The algebra operation to evaluate.
   * @param queryBindingsOptions Optional bindings query options.
   * @param context The action context.
   * @param firstLink The initial link to start traversal from.
   * @param maxIterators Maximum number of concurrent sub-iterators.
   * @param sourceStateGetter Function to resolve a link into a source state.
   * @param mediatorMetadataAccumulate Mediator for metadata accumulation.
   * @param mediatorRdfResolveHypermediaLinks Mediator for hypermedia link resolution.
   * @param mediatorRdfResolveHypermediaLinksQueue Mediator for link queue resolution.
   */
  public constructor(
    operation: Algebra.Operation,
    queryBindingsOptions: IQueryBindingsOptions | undefined,
    context: IActionContext,
    firstLink: ILink,
    maxIterators: number,
    sourceStateGetter: SourceStateGetter,
    mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate,
    mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks,
    mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue,
  ) {
    super(
      operation,
      queryBindingsOptions,
      context,
      firstLink,
      maxIterators,
      sourceStateGetter,
    );
    this.mediatorMetadataAccumulate = mediatorMetadataAccumulate;
    this.mediatorRdfResolveHypermediaLinks = mediatorRdfResolveHypermediaLinks;
    this.mediatorRdfResolveHypermediaLinksQueue = mediatorRdfResolveHypermediaLinksQueue;
    this.handledUrls = { [firstLink.url]: true };
  }

  /**
   * Checks whether this iterator can be closed by verifying the link queue is empty and no iterators are running.
   * @param linkQueue The link queue to check.
   * @param requireQueueEmpty Whether the queue must be empty to allow closing.
   * @return True if the queue is empty and no iterators are running.
   */
  protected override isCloseable(linkQueue: ILinkQueue, requireQueueEmpty: boolean): boolean {
    return (requireQueueEmpty ? linkQueue.isEmpty() : linkQueue.isEmpty()) && !this.areIteratorsRunning();
  }

  /**
   * Lazily initializes and returns the link queue via the links queue mediator.
   * @return A promise resolving to the link queue instance.
   */
  public getLinkQueue(): Promise<ILinkQueue> {
    if (!this.linkQueue) {
      this.linkQueue = this.mediatorRdfResolveHypermediaLinksQueue
        .mediate({ context: this.context })
        .then(result => result.linkQueue);
    }
    return this.linkQueue;
  }

  /**
   * Resolves hypermedia links from source metadata and filters out previously visited URLs.
   * @param metadata The metadata of the current source.
   * @param startSource The source state from which the metadata originates.
   * @return An array of unvisited links to follow.
   */
  protected async getSourceLinks(metadata: Record<string, any>, startSource: ISourceState): Promise<ILink[]> {
    try {
      const { links } = await this.mediatorRdfResolveHypermediaLinks.mediate({ context: this.context, metadata });
      // Update discovery event statistic if available
      const traversalTracker: IStatisticBase<IDiscoverEventData> | undefined =
        this.context.get(KeysStatistics.discoveredLinks);
      if (traversalTracker) {
        for (const link of links) {
          traversalTracker.updateStatistic({ url: link.url, metadata: { ...link.metadata }}, startSource.link);
        }
      }

      // Filter URLs to avoid cyclic next-page loops
      return links.filter((link) => {
        if (this.handledUrls[link.url]) {
          return false;
        }
        this.handledUrls[link.url] = true;
        return true;
      });
    } catch {
      // No next URLs may be available, for example when we've reached the end of a Hydra next-page sequence.
      return [];
    }
  }

  /**
   * Delegates metadata accumulation to the metadata accumulate mediator.
   * @param accumulatedMetadata The previously accumulated metadata.
   * @param appendingMetadata The new metadata to append.
   * @return The merged metadata result.
   */
  public async accumulateMetadata(
    accumulatedMetadata: MetadataBindings,
    appendingMetadata: MetadataBindings,
  ): Promise<MetadataBindings> {
    return <MetadataBindings> (await this.mediatorMetadataAccumulate.mediate({
      mode: 'append',
      accumulatedMetadata,
      appendingMetadata,
      context: this.context,
    })).metadata;
  }
}
