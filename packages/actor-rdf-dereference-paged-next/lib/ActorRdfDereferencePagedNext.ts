import {ActorHttpInvalidateListenable, IActionHttpInvalidate} from "@comunica/bus-http-invalidate";
import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {ActorRdfDereferencePaged, IActionRdfDereferencePaged,
  IActorRdfDereferencePagedOutput} from "@comunica/bus-rdf-dereference-paged";
import {IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as LRUCache from "lru-cache";
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
  public readonly cacheSize: number;
  public readonly cache: LRUCache<string, Promise<IActorRdfDereferencePagedOutput>>;
  public readonly httpInvalidator: ActorHttpInvalidateListenable;

  constructor(args: IActorRdfDereferencePaged) {
    super(args);
    this.cache = this.cacheSize ? new LRUCache<string, any>({ max: this.cacheSize }) : null;
    if (this.cache) {
      this.httpInvalidator.addInvalidateListener(
        ({ url }: IActionHttpInvalidate) => url ? this.cache.del(url) : this.cache.reset());
    }
  }

  public test(action: IActionRdfDereferencePaged): Promise<IActorTest> {
    // Try to determine an actor in the RDF dereference bus to see if we can handle the given URL.
    return this.mediatorRdfDereference.mediateActor({ context: action.context, url: action.url });
  }

  public run(action: IActionRdfDereferencePaged): Promise<IActorRdfDereferencePagedOutput> {
    if (this.cacheSize && this.cache.has(action.url)) {
      return this.cloneOutput(this.cache.get(action.url));
    }
    const output: Promise<IActorRdfDereferencePagedOutput> = this.runAsync(action);
    if (this.cacheSize) {
      this.cache.set(action.url, output);
      return this.cloneOutput(output);
    } else {
      return output;
    }
  }

  /**
   * Make a copy of the given output promise.
   * @param {Promise<IActorRdfDereferencePagedOutput>} outputPromise An output promise.
   * @return {Promise<IActorRdfDereferencePagedOutput>} A cloned output promise.
   */
  protected async cloneOutput(outputPromise: Promise<IActorRdfDereferencePagedOutput>)
  : Promise<IActorRdfDereferencePagedOutput> {
    const output: IActorRdfDereferencePagedOutput = await outputPromise;
    return {
      data: output.data.clone(),
      firstPageMetadata: () => output.firstPageMetadata().then(
        (metadata: {[id: string]: any}) => Object.assign({}, metadata)),
      firstPageUrl: output.firstPageUrl,
      triples: output.triples,
    };
  }

  /**
   * Actual logic to produce the paged output.
   * @param {IActionRdfDereferencePaged} action An action.
   * @return {Promise<IActorRdfDereferencePagedOutput>} The output.
   */
  protected async runAsync(action: IActionRdfDereferencePaged): Promise<IActorRdfDereferencePagedOutput> {
    const firstPage: IActorRdfDereferenceOutput = await this.mediatorRdfDereference.mediate(action);
    const firstPageUrl: string = firstPage.url;

    const firstPageMetaSplit: IActorRdfMetadataOutput = await this.mediatorMetadata
      .mediate({ context: action.context, url: firstPageUrl, quads: firstPage.quads, triples: firstPage.triples });
    let materializedFirstPageMetadata: Promise<{[id: string]: any}> = null;
    const firstPageMetadata: () => Promise<{[id: string]: any}> = () => {
      return materializedFirstPageMetadata || (materializedFirstPageMetadata = this.mediatorMetadataExtract.mediate(
        { context: action.context, url: firstPageUrl, metadata: firstPageMetaSplit.metadata })
        .then((output) => output.metadata));
    };

    const data: MediatedPagedAsyncRdfIterator = new MediatedPagedAsyncRdfIterator(firstPageUrl, firstPageMetaSplit.data,
      firstPageMetadata, this.mediatorRdfDereference, this.mediatorMetadata, this.mediatorMetadataExtract,
      action.context);
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
  cacheSize: number;
  httpInvalidator: ActorHttpInvalidateListenable;
}
