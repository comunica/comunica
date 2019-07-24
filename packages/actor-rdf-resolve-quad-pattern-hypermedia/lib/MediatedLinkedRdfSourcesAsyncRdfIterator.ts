import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {IActionRdfResolveHypermedia, IActorRdfResolveHypermediaOutput} from "@comunica/bus-rdf-resolve-hypermedia";
import {
  IActionRdfResolveHypermediaLinks,
  IActorRdfResolveHypermediaLinksOutput,
} from "@comunica/bus-rdf-resolve-hypermedia-links";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {ISourceState, LinkedRdfSourcesAsyncRdfIterator} from "./LinkedRdfSourcesAsyncRdfIterator";

/**
 * An quad iterator that can iterate over consecutive RDF sources
 * that are determined using the rdf-resolve-hypermedia-links bus.
 *
 * @see LinkedRdfSourcesAsyncRdfIterator
 */
export class MediatedLinkedRdfSourcesAsyncRdfIterator extends LinkedRdfSourcesAsyncRdfIterator {

  private readonly mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest,
    IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  private readonly mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  private readonly mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
    IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;
  private readonly mediatorRdfResolveHypermedia: Mediator<Actor<IActionRdfResolveHypermedia, IActorTest,
    IActorRdfResolveHypermediaOutput>, IActionRdfResolveHypermedia, IActorTest, IActorRdfResolveHypermediaOutput>;
  private readonly mediatorRdfResolveHypermediaLinks: Mediator<Actor<IActionRdfResolveHypermediaLinks, IActorTest,
    IActorRdfResolveHypermediaLinksOutput>, IActionRdfResolveHypermediaLinks, IActorTest,
    IActorRdfResolveHypermediaLinksOutput>;

  private readonly context: ActionContext;
  private readonly forceSourceType: string;
  private readonly handledUrls?: {[url: string]: boolean};

  constructor(cacheSize: number, context: ActionContext, forceSourceType: string,
              subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term,
              firstUrl: string, mediators: IMediatorArgs) {
    super(cacheSize, subject, predicate, object, graph, firstUrl, { autoStart: false });
    this.context = context;
    this.forceSourceType = forceSourceType;
    this.mediatorRdfDereference = mediators.mediatorRdfDereference;
    this.mediatorMetadata = mediators.mediatorMetadata;
    this.mediatorMetadataExtract = mediators.mediatorMetadataExtract;
    this.mediatorRdfResolveHypermedia = mediators.mediatorRdfResolveHypermedia;
    this.mediatorRdfResolveHypermediaLinks = mediators.mediatorRdfResolveHypermediaLinks;
    this.handledUrls = {};
  }

  protected async getNextUrls(metadata: {[id: string]: any}): Promise<string[]> {
    try {
      const { urls } = await this.mediatorRdfResolveHypermediaLinks.mediate({ context: this.context, metadata });

      // Filter URLs to avoid cyclic next-page loops
      return urls.filter((url) => {
        if (this.handledUrls[url]) {
          return false;
        } else {
          this.handledUrls[url] = true;
          return true;
        }
      });
    } catch (e) {
      // No next URLs may be available, for example when we've reached the end of a Hydra next-page sequence.
      return [];
    }
  }

  protected async getNextSource(url: string, handledDatasets: {[type: string]: boolean}): Promise<ISourceState> {
    // Get the RDF representation of the given document
    const context = this.context;
    const rdfDereferenceOutput: IActorRdfDereferenceOutput = await this.mediatorRdfDereference
      .mediate({ context, url });
    url = rdfDereferenceOutput.url;

    // Determine the metadata
    const rdfMetadataOuput: IActorRdfMetadataOutput = await this.mediatorMetadata.mediate(
      { context, url, quads: rdfDereferenceOutput.quads, triples: rdfDereferenceOutput.triples });
    const { metadata } = await this.mediatorMetadataExtract
      .mediate({ context, url, metadata: rdfMetadataOuput.metadata });

    // Determine the source
    const { source, dataset } = await this.mediatorRdfResolveHypermedia.mediate({
      context,
      forceSourceType: this.forceSourceType,
      handledDatasets,
      metadata,
      quads: rdfMetadataOuput.data,
      url,
    });

    if (dataset) {
      // Mark the dataset as applied
      // This is needed to make sure that things like QPF search forms are only applied once,
      // and next page links are followed after that.
      handledDatasets[dataset] = true;
    }

    return { source, metadata, handledDatasets };
  }

}

export interface IMediatorArgs {
  mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest,
    IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
    IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;
  mediatorRdfResolveHypermedia: Mediator<Actor<IActionRdfResolveHypermedia, IActorTest,
    IActorRdfResolveHypermediaOutput>, IActionRdfResolveHypermedia, IActorTest, IActorRdfResolveHypermediaOutput>;
  mediatorRdfResolveHypermediaLinks: Mediator<Actor<IActionRdfResolveHypermediaLinks, IActorTest,
    IActorRdfResolveHypermediaLinksOutput>, IActionRdfResolveHypermediaLinks, IActorTest,
    IActorRdfResolveHypermediaLinksOutput>;
}
