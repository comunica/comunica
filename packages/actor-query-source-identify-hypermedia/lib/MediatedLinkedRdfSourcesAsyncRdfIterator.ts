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
  private readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  private readonly mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  private readonly mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
  private readonly handledUrls: Record<string, boolean>;
  private linkQueue: Promise<ILinkQueue> | undefined;

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

  protected override isCloseable(linkQueue: ILinkQueue, requireQueueEmpty: boolean): boolean {
    return (requireQueueEmpty ? linkQueue.isEmpty() : linkQueue.isEmpty()) && !this.areIteratorsRunning();
  }

  public getLinkQueue(): Promise<ILinkQueue> {
    if (!this.linkQueue) {
      this.linkQueue = this.mediatorRdfResolveHypermediaLinksQueue
        .mediate({ context: this.context })
        .then(result => result.linkQueue);
    }
    return this.linkQueue;
  }

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
