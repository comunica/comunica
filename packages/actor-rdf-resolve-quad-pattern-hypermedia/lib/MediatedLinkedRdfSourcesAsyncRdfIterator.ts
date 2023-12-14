import type { IActorDereferenceRdfOutput, MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type { IActorRdfMetadataOutput, MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { MediatorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import type { ILink,
  MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { ILinkQueue,
  MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActionContext, IAggregatedStore, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { Readable } from 'readable-stream';
import type { ISourceState } from './LinkedRdfSourcesAsyncRdfIterator';
import { LinkedRdfSourcesAsyncRdfIterator } from './LinkedRdfSourcesAsyncRdfIterator';

const DF = new DataFactory();

/**
 * An quad iterator that can iterate over consecutive RDF sources
 * that are determined using the rdf-resolve-hypermedia-links bus.
 *
 * @see LinkedRdfSourcesAsyncRdfIterator
 */
export class MediatedLinkedRdfSourcesAsyncRdfIterator extends LinkedRdfSourcesAsyncRdfIterator {
  private readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  private readonly mediatorMetadata: MediatorRdfMetadata;
  private readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  private readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  private readonly mediatorRdfResolveHypermedia: MediatorRdfResolveHypermedia;
  private readonly mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  private readonly mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
  private readonly context: IActionContext;
  private readonly forceSourceType?: string;
  private readonly handledUrls: Record<string, boolean>;
  private readonly aggregatedStore: IAggregatedStore | undefined;
  private linkQueue: Promise<ILinkQueue> | undefined;
  private wasForcefullyClosed = false;

  public constructor(cacheSize: number, context: IActionContext, forceSourceType: string | undefined,
    subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term,
    firstUrl: string, maxIterators: number, aggregatedStore: IAggregatedStore | undefined,
    mediators: IMediatorArgs) {
    super(
      cacheSize,
      subject,
      predicate,
      object,
      graph,
      firstUrl,
      maxIterators,
      // Buffersize must be infinite for an aggregated store because it must keep filling until there are no more
      // derived iterators in the aggregated store.
      aggregatedStore ? { maxBufferSize: Number.POSITIVE_INFINITY } : undefined,
    );
    this.context = context;
    this.forceSourceType = forceSourceType;
    this.mediatorDereferenceRdf = mediators.mediatorDereferenceRdf;
    this.mediatorMetadata = mediators.mediatorMetadata;
    this.mediatorMetadataExtract = mediators.mediatorMetadataExtract;
    this.mediatorMetadataAccumulate = mediators.mediatorMetadataAccumulate;
    this.mediatorRdfResolveHypermedia = mediators.mediatorRdfResolveHypermedia;
    this.mediatorRdfResolveHypermediaLinks = mediators.mediatorRdfResolveHypermediaLinks;
    this.mediatorRdfResolveHypermediaLinksQueue = mediators.mediatorRdfResolveHypermediaLinksQueue;
    this.handledUrls = { [firstUrl]: true };
    this.aggregatedStore = aggregatedStore;
  }

  // Mark the aggregated store as ended once we trigger the closing or destroying of this iterator.
  // We don't override _end, because that would mean that we have to wait
  // until the buffer of this iterator must be fully consumed, which will not always be the case.

  public close(): void {
    if (!this.aggregatedStore) {
      super.close();
      return;
    }
    this.getLinkQueue()
      .then(linkQueue => {
        if (this.isCloseable(linkQueue)) {
          this.aggregatedStore?.end();
          super.close();
        } else {
          this.wasForcefullyClosed = true;
        }
      })
      .catch(error => super.destroy(error));
  }

  public destroy(cause?: Error): void {
    if (!this.aggregatedStore) {
      super.destroy(cause);
      return;
    }
    this.getLinkQueue()
      .then(linkQueue => {
        if (cause || this.isCloseable(linkQueue)) {
          this.aggregatedStore?.end();
          super.destroy(cause);
        } else {
          this.wasForcefullyClosed = true;
        }
      })
      .catch(error => super.destroy(error));
  }

  protected isCloseable(linkQueue: ILinkQueue): boolean {
    return (this.wasForcefullyClosed || linkQueue.isEmpty()) && !this.areIteratorsRunning();
  }

  protected override canStartNewIterator(): boolean {
    // Also allow sub-iterators to be started if the aggregated store has at least one running iterator.
    // We need this because there are cases where these running iterators will be consumed before this linked iterator.
    return !this.wasForcefullyClosed &&
      (this.aggregatedStore && this.aggregatedStore.hasRunningIterators()) || super.canStartNewIterator();
  }

  protected override isRunning(): boolean {
    // Same as above
    return (this.aggregatedStore && this.aggregatedStore.hasRunningIterators()) || !this.done;
  }

  protected shouldStoreSourcesStates(): boolean {
    return this.aggregatedStore === undefined && !this.context.get(KeysInitQuery.disableCaching);
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
      return links.filter(link => {
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

  protected async getSource(link: ILink, handledDatasets: Record<string, boolean>): Promise<ISourceState> {
    // Include context entries from link
    let context = this.context;
    if (link.context) {
      context = context.merge(link.context);
    }

    // Get the RDF representation of the given document
    let url = link.url;
    let quads: RDF.Stream;
    let metadata: Record<string, any>;
    try {
      const dereferenceRdfOutput: IActorDereferenceRdfOutput = await this.mediatorDereferenceRdf
        .mediate({ context, url });
      url = dereferenceRdfOutput.url;

      // Determine the metadata
      const rdfMetadataOutput: IActorRdfMetadataOutput = await this.mediatorMetadata.mediate(
        { context, url, quads: dereferenceRdfOutput.data, triples: dereferenceRdfOutput.metadata?.triples },
      );

      rdfMetadataOutput.data.on('error', () => {
        // Silence errors in the data stream,
        // as they will be emitted again in the metadata stream,
        // and will result in a promise rejection anyways.
        // If we don't do this, we end up with an unhandled error message
      });

      metadata = (await this.mediatorMetadataExtract.mediate({
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
      metadata = {};
    }

    // Aggregate all discovered quads into a store.
    this.aggregatedStore?.setBaseMetadata(<MetadataQuads> metadata, false);
    this.aggregatedStore?.containedSources.add(link.url);
    this.aggregatedStore?.import(quads);

    // Determine the source
    const { source, dataset } = await this.mediatorRdfResolveHypermedia.mediate({
      context,
      forceSourceType: this.forceSourceType,
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

    return { link, source, metadata: <MetadataQuads> metadata, handledDatasets };
  }

  protected startIterator(startSource: ISourceState, firstPage: boolean): void {
    if (this.aggregatedStore && !this.aggregatedStore.containedSources.has(startSource.link.url)) {
      // A source that has been cached due to earlier query executions may not be part of the aggregated store yet.
      // In that case, we add all quads from that source to the aggregated store.
      this.aggregatedStore?.containedSources.add(startSource.link.url);
      const stream = startSource.source!.match(
        DF.variable('s'),
        DF.variable('p'),
        DF.variable('o'),
        DF.variable('g'),
        this.context,
      );
      this.aggregatedStore.import(stream)
        .on('end', () => {
          super.startIterator(startSource, firstPage);
        });
    } else {
      super.startIterator(startSource, firstPage);
    }
  }

  public async accumulateMetadata(
    accumulatedMetadata: MetadataQuads,
    appendingMetadata: MetadataQuads,
  ): Promise<MetadataQuads> {
    return <MetadataQuads> (await this.mediatorMetadataAccumulate.mediate({
      mode: 'append',
      accumulatedMetadata,
      appendingMetadata,
      context: this.context,
    })).metadata;
  }

  protected updateMetadata(metadataNew: MetadataQuads): void {
    super.updateMetadata(metadataNew);
    this.aggregatedStore?.setBaseMetadata(metadataNew, true);
  }
}

export interface IMediatorArgs {
  mediatorDereferenceRdf: MediatorDereferenceRdf;
  mediatorMetadata: MediatorRdfMetadata;
  mediatorMetadataExtract: MediatorRdfMetadataExtract;
  mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  mediatorRdfResolveHypermedia: MediatorRdfResolveHypermedia;
  mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
}
