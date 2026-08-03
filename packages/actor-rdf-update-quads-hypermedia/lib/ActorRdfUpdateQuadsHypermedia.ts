import type { IActionDereference } from '@comunica/bus-dereference';
import type { IActorDereferenceRdfOutput, MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { IActorRdfMetadataOutput, MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { MediatorRdfUpdateHypermedia } from '@comunica/bus-rdf-update-hypermedia';
import { ActorRdfUpdateQuadsDestination } from '@comunica/bus-rdf-update-quads';
import type { IActionRdfUpdateQuads, IQuadDestination, IActorRdfUpdateQuadsArgs } from '@comunica/bus-rdf-update-quads';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { IActionContext, ICachePolicy, IDataDestination } from '@comunica/types';
import {
  getContextDestination,
  getContextDestinationUrl,
  getDataDestinationType,
} from '@comunica/utils-query-operation';
import { LRUCache } from 'lru-cache';

/**
 * A comunica Hypermedia RDF Update Quads Actor.
 */
export class ActorRdfUpdateQuadsHypermedia extends ActorRdfUpdateQuadsDestination {
  public readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  public readonly mediatorMetadata: MediatorRdfMetadata;
  public readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  public readonly mediatorRdfUpdateHypermedia: MediatorRdfUpdateHypermedia;
  public readonly cacheSize: number;
  public readonly httpInvalidator: ActorHttpInvalidateListenable;
  public readonly cache?: LRUCache<string, Promise<{
    destination: IQuadDestination;
    cachePolicy: ICachePolicy<IActionDereference> | undefined;
  }>>;

  public constructor(args: IActorRdfUpdateQuadsHypermediaArgs) {
    super(args);
    this.mediatorDereferenceRdf = args.mediatorDereferenceRdf;
    this.mediatorMetadata = args.mediatorMetadata;
    this.mediatorMetadataExtract = args.mediatorMetadataExtract;
    this.mediatorRdfUpdateHypermedia = args.mediatorRdfUpdateHypermedia;
    this.cacheSize = args.cacheSize;
    this.httpInvalidator = args.httpInvalidator;
    this.cache = this.cacheSize ? new LRUCache<string, any>({ max: this.cacheSize }) : undefined;
    const cache = this.cache;
    if (cache) {
      this.httpInvalidator.addInvalidateListener(
        ({ url }: IActionHttpInvalidate) => url ? cache.delete(url) : cache.clear(),
      );
    }
  }

  public override async test(action: IActionRdfUpdateQuads): Promise<TestResult<IActorTest>> {
    const url = getContextDestinationUrl(getContextDestination(action.context));
    if (!url) {
      return failTest(`Actor ${this.name} can only update quads against a single destination URL.`);
    }
    return passTestVoid();
  }

  public getDestination(context: IActionContext): Promise<IQuadDestination> {
    const dataDestination: IDataDestination = getContextDestination(context)!;
    let url: string = getContextDestinationUrl(dataDestination)!;

    // Try to read from cache
    if (this.cache) {
      const ret = this.cache.get(url);
      if (ret) {
        return (async() => {
          const retMaterialized = await ret;
          if (retMaterialized.cachePolicy &&
            !await retMaterialized.cachePolicy?.satisfiesWithoutRevalidation({ url, context })) {
            // If it's not valid, delete cache entry, and re-fetch immediately
            // LIMITATION: we're not sending re-validation requests. So if the server sends a 304, we will perform a new
            // request and re-index the source. If an HTTP-level cache is active, the actual HTTP request will not be
            // sent, so only local re-indexing will happen, which is negligible in most cases.
            this.cache!.delete(url);
            return this.getDestination(context);
          }
          return retMaterialized.destination;
        })();
      }
    }

    // Otherwise, call mediators
    const ret = (async() => {
      let metadata: Record<string, any>;
      let exists: boolean;
      let cachePolicy: ICachePolicy<IActionDereference> | undefined;
      try {
        // Dereference destination URL
        const dereferenceRdfOutput: IActorDereferenceRdfOutput = await this.mediatorDereferenceRdf
          .mediate({ context, url, acceptErrors: true });
        exists = dereferenceRdfOutput.exists;
        url = dereferenceRdfOutput.url;
        cachePolicy = dereferenceRdfOutput.cachePolicy;

        // Determine the metadata
        const rdfMetadataOuput: IActorRdfMetadataOutput = await this.mediatorMetadata.mediate(
          { context, url, quads: dereferenceRdfOutput.data, triples: dereferenceRdfOutput.metadata?.triples },
        );
        metadata = (await this.mediatorMetadataExtract.mediate({
          context,
          url,
          metadata: rdfMetadataOuput.metadata,
          headers: dereferenceRdfOutput.headers,
          requestTime: dereferenceRdfOutput.requestTime,
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
      return { destination, cachePolicy };
    })();
    if (this.cache) {
      this.cache.set(url, ret);
    }
    return ret.then(({ destination }) => destination);
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
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^5.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /* eslint-enable max-len */
  /**
   * The RDF dereference mediator
   */
  mediatorDereferenceRdf: MediatorDereferenceRdf;
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
