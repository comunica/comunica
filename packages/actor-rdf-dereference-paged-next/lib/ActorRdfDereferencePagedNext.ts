import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { IActionRdfDereference, IActorRdfDereferenceOutput } from '@comunica/bus-rdf-dereference';
import type { IActionRdfDereferencePaged,
  IActorRdfDereferencePagedOutput } from '@comunica/bus-rdf-dereference-paged';
import { ActorRdfDereferencePaged } from '@comunica/bus-rdf-dereference-paged';
import type { IActionRdfMetadata, IActorRdfMetadataOutput } from '@comunica/bus-rdf-metadata';
import type { IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput } from '@comunica/bus-rdf-metadata-extract';
import type { Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import * as LRUCache from 'lru-cache';
import { MediatedPagedAsyncRdfIterator } from './MediatedPagedAsyncRdfIterator';

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
  public readonly cache?: LRUCache<string, Promise<IActorRdfDereferencePagedOutput>>;
  public readonly httpInvalidator: ActorHttpInvalidateListenable;

  public constructor(args: IActorRdfDereferencePaged) {
    super(args);
    this.cache = this.cacheSize ? new LRUCache<string, any>({ max: this.cacheSize }) : undefined;
    const cache = this.cache;
    if (cache) {
      this.httpInvalidator.addInvalidateListener(
        ({ url }: IActionHttpInvalidate) => url ? cache.del(url) : cache.reset(),
      );
    }
  }

  public test(action: IActionRdfDereferencePaged): Promise<IActorTest> {
    // Try to determine an actor in the RDF dereference bus to see if we can handle the given URL.
    return this.mediatorRdfDereference.mediateActor({ context: action.context, url: action.url });
  }

  public run(action: IActionRdfDereferencePaged): Promise<IActorRdfDereferencePagedOutput> {
    if (this.cache && this.cache.has(action.url)) {
      return this.cloneOutput(this.cache.get(action.url)!);
    }
    const output: Promise<IActorRdfDereferencePagedOutput> = this.runAsync(action);
    if (this.cache) {
      this.cache.set(action.url, output);
      return this.cloneOutput(output);
    }
    return output;
  }

  /**
   * Make a copy of the given output promise.
   * @param {Promise<IActorRdfDereferencePagedOutput>} outputPromise An output promise.
   * @return {Promise<IActorRdfDereferencePagedOutput>} A cloned output promise.
   */
  protected async cloneOutput(outputPromise: Promise<IActorRdfDereferencePagedOutput>):
  Promise<IActorRdfDereferencePagedOutput> {
    const output: IActorRdfDereferencePagedOutput = await outputPromise;
    return {
      data: output.data.clone(),
      firstPageMetadata: () => output.firstPageMetadata().then(
        (metadata: Record<string, any>) => ({ ...metadata }),
      ),
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
    let materializedFirstPageMetadata: Promise<Record<string, any>> | undefined;
    // eslint-disable-next-line no-return-assign
    const firstPageMetadata: () => Promise<Record<string, any>> = () => materializedFirstPageMetadata ??
      (materializedFirstPageMetadata = this.mediatorMetadataExtract.mediate(
        { context: action.context, url: firstPageUrl, metadata: firstPageMetaSplit.metadata },
      ).then(output => output.metadata));

    const data: MediatedPagedAsyncRdfIterator = new MediatedPagedAsyncRdfIterator(
      firstPageUrl,
      firstPageMetaSplit.data,
      firstPageMetadata,
      this.mediatorRdfDereference,
      this.mediatorMetadata,
      this.mediatorMetadataExtract,
      action.context,
    );
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
