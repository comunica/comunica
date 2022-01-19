import { Readable } from 'stream';
import type { IActorDereferenceOutput, MediatorDereference } from '@comunica/bus-dereference';
import type { IActorRdfMetadataOutput, MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { MediatorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import type { ILink,
  MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { ILinkQueue,
  MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { ISourceState } from './LinkedRdfSourcesAsyncRdfIterator';
import { LinkedRdfSourcesAsyncRdfIterator } from './LinkedRdfSourcesAsyncRdfIterator';

/**
 * An quad iterator that can iterate over consecutive RDF sources
 * that are determined using the rdf-resolve-hypermedia-links bus.
 *
 * @see LinkedRdfSourcesAsyncRdfIterator
 */
export class MediatedLinkedRdfSourcesAsyncRdfIterator extends LinkedRdfSourcesAsyncRdfIterator {
  private readonly mediatorDereference: MediatorDereference;
  private readonly mediatorMetadata: MediatorRdfMetadata;
  private readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  private readonly mediatorRdfResolveHypermedia: MediatorRdfResolveHypermedia;
  private readonly mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  private readonly mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
  private readonly context: IActionContext;
  private readonly forceSourceType?: string;
  private readonly handledUrls: Record<string, boolean>;
  private linkQueue: Promise<ILinkQueue> | undefined;

  public constructor(cacheSize: number, context: IActionContext, forceSourceType: string | undefined,
    subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term,
    firstUrl: string, mediators: IMediatorArgs) {
    super(cacheSize, subject, predicate, object, graph, firstUrl);
    this.context = context;
    this.forceSourceType = forceSourceType;
    this.mediatorDereference = mediators.mediatorDereference;
    this.mediatorMetadata = mediators.mediatorMetadata;
    this.mediatorMetadataExtract = mediators.mediatorMetadataExtract;
    this.mediatorRdfResolveHypermedia = mediators.mediatorRdfResolveHypermedia;
    this.mediatorRdfResolveHypermediaLinks = mediators.mediatorRdfResolveHypermediaLinks;
    this.mediatorRdfResolveHypermediaLinksQueue = mediators.mediatorRdfResolveHypermediaLinksQueue;
    this.handledUrls = { [firstUrl]: true };
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
      const rdfDereferenceOutput: IActorDereferenceOutput = await this.mediatorDereference
        .mediate({ context, url });
      url = rdfDereferenceOutput.url;

      // Determine the metadata
      const rdfMetadataOuput: IActorRdfMetadataOutput = await this.mediatorMetadata.mediate(
        { context, url, quads: rdfDereferenceOutput.quads, triples: rdfDereferenceOutput.triples },
      );
      metadata = (await this.mediatorMetadataExtract.mediate({
        context,
        url,
        metadata: rdfMetadataOuput.metadata,
        headers: rdfDereferenceOutput.headers,
        requestTime: rdfDereferenceOutput.requestTime,
      })).metadata;
      quads = rdfMetadataOuput.data;

      // Optionally filter the resulting data
      if (link.transform) {
        quads = await link.transform(quads);
      }
    } catch (error: unknown) {
      // Make sure that dereference errors are only emitted once an actor really needs the read quads
      // This for example allows SPARQL endpoints that error on service description fetching to still be source-forcible
      quads = new Readable();
      quads.read = () => {
        quads.emit('error', error);
        return null;
      };
      metadata = {};
    }

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

    return { link, source, metadata, handledDatasets };
  }
}

export interface IMediatorArgs {
  mediatorDereference: MediatorDereference;
  mediatorMetadata: MediatorRdfMetadata;
  mediatorMetadataExtract: MediatorRdfMetadataExtract;
  mediatorRdfResolveHypermedia: MediatorRdfResolveHypermedia;
  mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
}
