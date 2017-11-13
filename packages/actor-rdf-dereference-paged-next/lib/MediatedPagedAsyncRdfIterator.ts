import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {Actor, IActorTest, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {PagedAsyncRdfIterator} from "./PagedAsyncRdfIterator";

/**
 * A PagedAsyncRdfIterator that pages based on a set of mediators.
 *
 * It expects the first page to be already processed partially.
 * Based on the data stream of the first page, and a promise to the metadata of the first page,
 * it will emit data elements from this page and all following pages using the 'next' metadata link.
 *
 * `mediatorRdfDereference` is used to dereference the 'next' link to a quad stream.
 * `mediatorMetadata` is used to split this quad stream into a data and metadata stream.
 * `mediatorMetadataExtract` is used to collect the metadata object from this metadata stream,
 * possibly containing another 'next' link.
 */
export class MediatedPagedAsyncRdfIterator extends PagedAsyncRdfIterator {

  public readonly firstPageData: RDF.Stream;
  public readonly firstPageMetadata: Promise<{[id: string]: any}>;
  public readonly mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  public readonly mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  public readonly mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
    IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;

  constructor(firstPageUrl: string, firstPageData: RDF.Stream, firstPageMetadata: Promise<{[id: string]: any}>,
              mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest,
                IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
              mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
                IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
              mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
                IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest,
                IActorRdfMetadataExtractOutput>) {
    super(firstPageUrl);
    this.firstPageData = firstPageData;
    this.firstPageMetadata = firstPageMetadata;
    this.mediatorRdfDereference = mediatorRdfDereference;
    this.mediatorMetadata = mediatorMetadata;
    this.mediatorMetadataExtract = mediatorMetadataExtract;
  }

  protected async getIterator(url: string, page: number, onNextPage: (nextPage: string) => void) {
    let pageData: RDF.Stream;

    // Don't call mediators again if we are on the first page
    if (!page) {
      pageData = this.firstPageData;
      let next: string;
      try {
        next = (await this.firstPageMetadata).next;
      } catch (e) {
        this.emit('error', e);
      }
      if (next) {
        onNextPage(next);
      }
    } else {
      const pageQuads: IActorRdfDereferenceOutput = await this.mediatorRdfDereference.mediate({ url });
      const pageMetaSplit: IActorRdfMetadataOutput = await this.mediatorMetadata
        .mediate({ pageUrl: pageQuads.pageUrl, quads: pageQuads.quads });
      pageData = pageMetaSplit.data;

      // Don't await, we want to process metadata in the background.
      this.mediatorMetadataExtract.mediate({ pageUrl: pageQuads.pageUrl, metadata: pageMetaSplit.metadata })
        .then((result) => onNextPage(result.metadata.next)).catch((e) => this.emit('error', e));
    }

    return pageData;
  }
}
