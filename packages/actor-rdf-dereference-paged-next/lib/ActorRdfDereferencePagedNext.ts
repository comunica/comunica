import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {ActorRdfDereferencePaged, IActionRdfDereferencePaged,
  IActorRdfDereferencePagedOutput} from "@comunica/bus-rdf-dereference-paged";
import {IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {PagedAsyncRdfIterator} from "./PagedAsyncRdfIterator";

/**
 * An RDF Dereference Paged Actor that will lazily follow 'next' links as defined from the extracted metadata.
 */
export class ActorRdfDereferencePagedNext extends ActorRdfDereferencePaged implements IActorRdfDereferencePaged {

  public readonly mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  public readonly mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  public readonly mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
    IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;

  constructor(args: IActorRdfDereferencePaged) {
    super(args);
    if (!this.mediatorRdfDereference) {
      throw new Error('A valid "mediatorRdfDereference" argument must be provided.');
    }
    if (!this.mediatorMetadata) {
      throw new Error('A valid "mediatorMetadata" argument must be provided.');
    }
    if (!this.mediatorMetadataExtract) {
      throw new Error('A valid "mediatorMetadataExtract" argument must be provided.');
    }
  }

  public test(action: IActionRdfDereferencePaged): Promise<IActorTest> {
    // Try to determine an actor in the RDF dereference bus to see if we can handle the given URL.
    return this.mediatorRdfDereference.mediateActor({ url: action.url });
  }

  public async run(action: IActionRdfDereferencePaged): Promise<IActorRdfDereferencePagedOutput> {
    const firstPage: IActorRdfDereferenceOutput = await this.mediatorRdfDereference.mediate(action);
    const firstPageUrl: string = firstPage.pageUrl;

    const firstPageMetaSplit: IActorRdfMetadataOutput = await this.mediatorMetadata
      .mediate({ pageUrl: firstPageUrl, quads: firstPage.quads });
    const firstPageMetadata: {[id: string]: any} = (await this.mediatorMetadataExtract.mediate(
      { pageUrl: firstPageUrl, metadata: firstPageMetaSplit.metadata })).metadata;

    // We need to do this because class fields are not included in closures.
    const mediatorRdfDereference = this.mediatorRdfDereference;
    const mediatorMetadata = this.mediatorMetadata;
    const mediatorMetadataExtract = this.mediatorMetadataExtract;

    const data: PagedAsyncRdfIterator = new class // tslint:disable-line: max-classes-per-file
      extends PagedAsyncRdfIterator {
      protected async getIterator(url: string, page: number, onNextPage: (nextPage: string) => void) {
        let pageData: RDF.Stream;

        // Don't call mediators again if we are on the first page
        if (!page) {
          pageData = firstPageMetaSplit.data;
          onNextPage(firstPageMetadata.next);
        } else {
          const pageQuads: IActorRdfDereferenceOutput = await mediatorRdfDereference.mediate({ url });
          const pageMetaSplit: IActorRdfMetadataOutput = await mediatorMetadata
            .mediate({ pageUrl: pageQuads.pageUrl, quads: pageQuads.quads });
          pageData = pageMetaSplit.data;

          // Don't await, we want to process metadata in the background.
          mediatorMetadataExtract.mediate({ pageUrl: pageQuads.pageUrl, metadata: pageMetaSplit.metadata })
            .then((result) => onNextPage(result.metadata.next)).catch((e) => this.emit('error', e));
        }

        return pageData;
      }
    }(firstPageUrl);

    return { firstPageUrl, data, firstPageMetadata, triples: firstPage.triples };
  }

}

export interface IActorRdfDereferencePaged extends
  IActorArgs<IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput> {
  mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>,
    IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;
}
