import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { IActorRdfDereferenceOutput, MediatorRdfDereference } from '@comunica/bus-rdf-dereference';
import type { IActorRdfMetadataOutput, MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { MediatorRdfUpdateHypermedia } from '@comunica/bus-rdf-update-hypermedia';
import { ActorRdfUpdateQuadsDestination, getDataDestinationType } from '@comunica/bus-rdf-update-quads';
import type { IActionRdfUpdateQuads, IDataDestination,
  IQuadDestination, IActorRdfUpdateQuadsArgs } from '@comunica/bus-rdf-update-quads';
import type { IActorTest } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import LRUCache = require('lru-cache');

/**
 * A comunica Hypermedia RDF Update Quads Actor.
 */
export class ActorRdfUpdateQuadsHypermedia extends ActorRdfUpdateQuadsDestination {
  public readonly mediatorRdfDereference: MediatorRdfDereference;
  public readonly mediatorMetadata: MediatorRdfMetadata;
  public readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  public readonly mediatorRdfUpdateHypermedia: MediatorRdfUpdateHypermedia;
  public readonly cacheSize: number;
  public readonly cache?: LRUCache<string, Promise<IQuadDestination>>;
  public readonly httpInvalidator: ActorHttpInvalidateListenable;

  public constructor(args: IActorRdfUpdateQuadsHypermediaArgs) {
    super(args);
    this.cache = this.cacheSize ? new LRUCache<string, any>({ max: this.cacheSize }) : undefined;
    const cache = this.cache;
    if (cache) {
      this.httpInvalidator.addInvalidateListener(
        ({ url }: IActionHttpInvalidate) => url ? cache.del(url) : cache.reset(),
      );
    }
  }

  public async test(action: IActionRdfUpdateQuads): Promise<IActorTest> {
    const url = this.getContextDestinationUrl(this.getContextDestination(action.context));
    if (!url) {
      throw new Error(`Actor ${this.name} can only update quads against a single destination URL.`);
    }
    return true;
  }

  public getDestination(context: IActionContext): Promise<IQuadDestination> {
    const dataDestination: IDataDestination = this.getContextDestination(context)!;
    let url: string = this.getContextDestinationUrl(dataDestination)!;

    // Try to read from cache
    if (this.cache && this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Otherwise, call mediators
    const ret = (async() => {
      let metadata: Record<string, any>;
      let exists: boolean;
      try {
        // Dereference destination URL
        const rdfDereferenceOutput: IActorRdfDereferenceOutput = await this.mediatorRdfDereference
          .mediate({ context, url, acceptErrors: true });
        exists = rdfDereferenceOutput.exists;
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
      } catch {
        metadata = {};
        exists = false;
      }

      // Obtain destination
      const { destination } = await this.mediatorRdfUpdateHypermedia.mediate({
        context,
        url,
        metadata,
        exists,
        forceDestinationType: getDataDestinationType(dataDestination),
      });
      return destination;
    })();
    if (this.cache) {
      this.cache.set(url, ret);
    }
    return ret;
  }
}

export interface IActorRdfUpdateQuadsHypermediaArgs extends IActorRdfUpdateQuadsArgs {
  /**
   * The maximum number of entries in the LRU cache, set to 0 to disable.
   * @range {integer}
   * @default {100}
   */
  cacheSize: number;
  /* eslint-disable max-len */
  /**
   * An actor that listens to HTTP invalidation events
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^2.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /* eslint-enable max-len */
  /**
   * The RDF dereference mediator
   */
  mediatorRdfDereference: MediatorRdfDereference;
  /**
   * The metadata mediator
   */
  mediatorMetadata: MediatorRdfMetadata;
  /**
   * The metadata extract mediator
   */
  mediatorMetadataExtract: MediatorRdfMetadataExtract;
  /**
   * The hypermedia resolver
   */
  mediatorRdfUpdateHypermedia: MediatorRdfUpdateHypermedia;
}
