import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { MediatorRdfDereference } from '@comunica/bus-rdf-dereference';
import type { MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { MediatorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type { IActionRdfResolveQuadPattern,
  IQuadSource, IActorRdfResolveQuadPatternArgs } from '@comunica/bus-rdf-resolve-quad-pattern';
import { ActorRdfResolveQuadPatternSource, getDataSourceType } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { IActorTest } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import LRUCache = require('lru-cache');
import type { Algebra } from 'sparqlalgebrajs';
import { MediatedQuadSource } from './MediatedQuadSource';

/**
 * A comunica Hypermedia RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternHypermedia extends ActorRdfResolveQuadPatternSource
  implements IActorRdfResolveQuadPatternHypermediaArgs {
  public readonly mediatorRdfDereference: MediatorRdfDereference;
  public readonly mediatorMetadata: MediatorRdfMetadata;
  public readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  public readonly mediatorRdfResolveHypermedia: MediatorRdfResolveHypermedia;
  public readonly mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  public readonly mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
  public readonly cacheSize: number;
  public readonly cache?: LRUCache<string, MediatedQuadSource>;
  public readonly httpInvalidator: ActorHttpInvalidateListenable;

  public constructor(args: IActorRdfResolveQuadPatternHypermediaArgs) {
    super(args);
    this.cache = this.cacheSize ? new LRUCache<string, any>({ max: this.cacheSize }) : undefined;
    const cache = this.cache;
    if (cache) {
      this.httpInvalidator.addInvalidateListener(
        ({ url }: IActionHttpInvalidate) => url ? cache.del(url) : cache.reset(),
      );
    }
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    const sources = this.hasContextSingleSource(action.context);
    if (!sources) {
      throw new Error(`Actor ${this.name} can only resolve quad pattern queries against a single source.`);
    }
    return true;
  }

  protected getSource(context: IActionContext, operation: Algebra.Pattern): Promise<IQuadSource> {
    const contextSource = this.getContextSource(context)!;
    const url = this.getContextSourceUrl(contextSource)!;
    let source: MediatedQuadSource;

    // Try to read from cache
    if (this.cache && this.cache.has(url)) {
      source = this.cache.get(url)!;
    } else {
      // If not in cache, create a new source
      source = new MediatedQuadSource(this.cacheSize, context, url, getDataSourceType(contextSource), {
        mediatorMetadata: this.mediatorMetadata,
        mediatorMetadataExtract: this.mediatorMetadataExtract,
        mediatorRdfDereference: this.mediatorRdfDereference,
        mediatorRdfResolveHypermedia: this.mediatorRdfResolveHypermedia,
        mediatorRdfResolveHypermediaLinks: this.mediatorRdfResolveHypermediaLinks,
        mediatorRdfResolveHypermediaLinksQueue: this.mediatorRdfResolveHypermediaLinksQueue,
      });

      // Set in cache
      if (this.cache) {
        this.cache.set(url, source);
      }
    }

    return Promise.resolve(source);
  }
}

export interface IActorRdfResolveQuadPatternHypermediaArgs extends IActorRdfResolveQuadPatternArgs {
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
   * The hypermedia resolve mediator
   */
  mediatorRdfResolveHypermedia: MediatorRdfResolveHypermedia;
  /**
   * The hypermedia links resolve mediator
   */
  mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  /**
   * The hypermedia links queue resolve mediator
   */
  mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
}
