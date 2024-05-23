import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { ILink, MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type {
  ILinkQueue,
  MediatorRdfResolveHypermediaLinksQueue,
} from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IActionContext, IAggregatedStore, IQueryBindingsOptions, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import type { SourceStateGetter, ISourceState } from './LinkedRdfSourcesAsyncRdfIterator';
import { LinkedRdfSourcesAsyncRdfIterator } from './LinkedRdfSourcesAsyncRdfIterator';

const DF = new DataFactory<RDF.BaseQuad>();
const AF = new Factory();

/**
 * An quad iterator that can iterate over consecutive RDF sources
 * that are determined using the rdf-resolve-hypermedia-links bus.
 *
 * @see LinkedRdfSourcesAsyncRdfIterator
 */
export class MediatedLinkedRdfSourcesAsyncRdfIterator extends LinkedRdfSourcesAsyncRdfIterator {
  private readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  private readonly mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  private readonly mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
  private readonly forceSourceType?: string;
  private readonly handledUrls: Record<string, boolean>;
  private readonly aggregatedStore: IAggregatedStore | undefined;
  private linkQueue: Promise<ILinkQueue> | undefined;
  private wasForcefullyClosed = false;

  public constructor(
    cacheSize: number,
    operation: Algebra.Operation,
    queryBindingsOptions: IQueryBindingsOptions | undefined,
    context: IActionContext,
    forceSourceType: string | undefined,
    firstUrl: string,
    maxIterators: number,
    sourceStateGetter: SourceStateGetter,
    aggregatedStore: IAggregatedStore | undefined,
    mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate,
    mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks,
    mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue,
  ) {
    super(
      cacheSize,
      operation,
      queryBindingsOptions,
      context,
      firstUrl,
      maxIterators,
      sourceStateGetter,
      // Buffersize must be infinite for an aggregated store because it must keep filling until there are no more
      // derived iterators in the aggregated store.
      aggregatedStore ? { maxBufferSize: Number.POSITIVE_INFINITY } : undefined,
    );
    this.forceSourceType = forceSourceType;
    this.mediatorMetadataAccumulate = mediatorMetadataAccumulate;
    this.mediatorRdfResolveHypermediaLinks = mediatorRdfResolveHypermediaLinks;
    this.mediatorRdfResolveHypermediaLinksQueue = mediatorRdfResolveHypermediaLinksQueue;
    this.handledUrls = { [firstUrl]: true };
    this.aggregatedStore = aggregatedStore;
  }

  // Mark the aggregated store as ended once we trigger the closing or destroying of this iterator.
  // We don't override _end, because that would mean that we have to wait
  // until the buffer of this iterator must be fully consumed, which will not always be the case.

  public override close(): void {
    if (!this.aggregatedStore) {
      super.close();
      return;
    }

    this.getLinkQueue()
      .then((linkQueue) => {
        if (this.isCloseable(linkQueue, false)) {
          // Wait a tick before ending the aggregatedStore, to ensure that pending match() calls to it have started.
          if (this.aggregatedStore) {
            setTimeout(() => this.aggregatedStore!.end());
          }
          super.close();
        } else {
          this.wasForcefullyClosed = true;
        }
      })
      .catch(error => super.destroy(error));
  }

  public override destroy(cause?: Error): void {
    if (!this.aggregatedStore) {
      super.destroy(cause);
      return;
    }

    this.getLinkQueue()
      .then((linkQueue) => {
        if (cause ?? this.isCloseable(linkQueue, false)) {
          // Wait a tick before ending the aggregatedStore, to ensure that pending match() calls to it have started.
          if (this.aggregatedStore) {
            setTimeout(() => this.aggregatedStore!.end());
          }
          super.destroy(cause);
        } else {
          this.wasForcefullyClosed = true;
        }
      })
      .catch(error => super.destroy(error));
  }

  protected override isCloseable(linkQueue: ILinkQueue, requireQueueEmpty: boolean): boolean {
    return (requireQueueEmpty ? linkQueue.isEmpty() : this.wasForcefullyClosed || linkQueue.isEmpty()) &&
      !this.areIteratorsRunning();
  }

  protected override canStartNewIterator(): boolean {
    // Also allow sub-iterators to be started if the aggregated store has at least one running iterator.
    // We need this because there are cases where these running iterators will be consumed before this linked iterator.
    return (!this.wasForcefullyClosed &&
      // eslint-disable-next-line ts/prefer-nullish-coalescing
      (this.aggregatedStore && this.aggregatedStore.hasRunningIterators())) || super.canStartNewIterator();
  }

  protected override canStartNewIteratorConsiderReadable(): boolean {
    return !this.aggregatedStore;
  }

  protected override isRunning(): boolean {
    // Same as above
    // eslint-disable-next-line ts/prefer-nullish-coalescing
    return (this.aggregatedStore && this.aggregatedStore.hasRunningIterators()) || !this.done;
  }

  public getLinkQueue(): Promise<ILinkQueue> {
    if (!this.linkQueue) {
      this.linkQueue = this.mediatorRdfResolveHypermediaLinksQueue
        .mediate({ firstUrl: this.firstUrl, context: this.context })
        .then(result => result.linkQueue);
    }
    return this.linkQueue;
  }

  protected async getSourceLinks(metadata: Record<string, any>): Promise<ILink[]> {
    try {
      const { links } = await this.mediatorRdfResolveHypermediaLinks.mediate({ context: this.context, metadata });

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

  protected override startIterator(startSource: ISourceState): void {
    if (this.aggregatedStore && !this.aggregatedStore.containedSources.has(startSource.link.url)) {
      // A source that has been cached due to earlier query executions may not be part of the aggregated store yet.
      // In that case, we add all quads from that source to the aggregated store.
      this.aggregatedStore?.containedSources.add(startSource.link.url);
      const stream = startSource.source.queryBindings(
        AF.createPattern(
          DF.variable('s'),
          DF.variable('p'),
          DF.variable('o'),
          DF.variable('g'),
        ),
        this.context.set(KeysQueryOperation.unionDefaultGraph, true),
      ).transform({
        map: bindings => DF.quad(
          bindings.get('s')!,
          bindings.get('p')!,
          bindings.get('o')!,
          bindings.get('g'),
        ),
        autoStart: false,
      });
      this.aggregatedStore.import(<RDF.Stream> stream)
        .on('end', () => {
          super.startIterator(startSource);
        });
    } else {
      super.startIterator(startSource);
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

  protected override updateMetadata(metadataNew: MetadataBindings): void {
    super.updateMetadata(metadataNew);
    this.aggregatedStore?.setBaseMetadata(metadataNew, true);
  }
}
