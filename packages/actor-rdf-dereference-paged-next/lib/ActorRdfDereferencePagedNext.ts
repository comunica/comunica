import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {ActorRdfDereferencePaged, IActionRdfDereferencePaged,
  IActorRdfDereferencePagedOutput} from "@comunica/bus-rdf-dereference-paged";
import {IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {MediatedPagedAsyncRdfIterator} from "./MediatedPagedAsyncRdfIterator";

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
    const firstPageMetadata: Promise<{[id: string]: any}> = this.mediatorMetadataExtract.mediate(
      { pageUrl: firstPageUrl, metadata: firstPageMetaSplit.metadata })
      .then((output) => output.metadata);

    const data: MediatedPagedAsyncRdfIterator = new MediatedPagedAsyncRdfIterator(firstPageUrl, firstPageMetaSplit.data,
      firstPageMetadata, this.mediatorRdfDereference, this.mediatorMetadata, this.mediatorMetadataExtract);
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
