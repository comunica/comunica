import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';
import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { IActionRdfDereference, IActorRdfDereferenceOutput } from '@comunica/bus-rdf-dereference';
import type { IActionRdfMetadata, IActorRdfMetadataOutput } from '@comunica/bus-rdf-metadata';
import type { IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput } from '@comunica/bus-rdf-metadata-extract';
import type { IActionRdfResolveHypermedia,
  IActorRdfResolveHypermediaOutput } from '@comunica/bus-rdf-resolve-hypermedia';
import type {
  IActionRdfResolveHypermediaLinks,
  IActorRdfResolveHypermediaLinksOutput,
} from '@comunica/bus-rdf-resolve-hypermedia-links';
import type {
  IActionRdfResolveHypermediaLinksQueue,
  IActorRdfResolveHypermediaLinksQueueOutput,
} from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type { IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput,
  IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import {
  ActorRdfResolveQuadPatternSource, getDataSourceType,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import type { ActionContext, Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import LRUCache = require('lru-cache');
import type { Algebra } from 'sparqlalgebrajs';
import { MediatedQuadSource } from './MediatedQuadSource';

/**
 * A comunica Hypermedia RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternHypermedia extends ActorRdfResolveQuadPatternSource
  implements IActorRdfResolveQuadPatternHypermediaArgs {
  // Mediators
  public readonly mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest,
  IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;

  public readonly mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
  IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;

  public readonly mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
  IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;

  public readonly mediatorRdfResolveHypermedia: Mediator<Actor<IActionRdfResolveHypermedia, IActorTest,
  IActorRdfResolveHypermediaOutput>, IActionRdfResolveHypermedia, IActorTest, IActorRdfResolveHypermediaOutput>;

  public readonly mediatorRdfResolveHypermediaLinks: Mediator<Actor<IActionRdfResolveHypermediaLinks, IActorTest,
  IActorRdfResolveHypermediaLinksOutput>, IActionRdfResolveHypermediaLinks, IActorTest,
  IActorRdfResolveHypermediaLinksOutput>;

  public readonly mediatorRdfResolveHypermediaLinksQueue?: Mediator<Actor<IActionRdfResolveHypermediaLinksQueue,
  IActorTest, IActorRdfResolveHypermediaLinksQueueOutput>, IActionRdfResolveHypermediaLinksQueue, IActorTest,
  IActorRdfResolveHypermediaLinksQueueOutput>;

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

  protected getSource(context: ActionContext, operation: Algebra.Pattern): Promise<IQuadSource> {
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
        mediatorRdfResolveHypermediaLinksQueue: this.mediatorRdfResolveHypermediaLinksQueue || <any> {
          // TODO: remove backwards-compatibility in next major version
          mediate: async() => ({ linkQueue: new LinkQueueFifo() }),
        },
      });

      // Set in cache
      if (this.cache) {
        this.cache.set(url, source);
      }
    }

    return Promise.resolve(source);
  }
}

export interface IActorRdfResolveQuadPatternHypermediaArgs extends
  IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  /**
   * The maximum number of entries in the LRU cache, set to 0 to disable.
   * @range {integer}
   * @default {100}
   */
  cacheSize: number;
  /* eslint-disable max-len */
  /**
   * An actor that listens to HTTP invalidation events
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^1.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /**
   * The RDF dereference mediator
   */
  mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest,
  IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  /**
   * The metadata mediator
   */
  mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
  IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  /**
   * The metadata extract mediator
   */
  mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
  IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;
  /**
   * The hypermedia resolve mediator
   */
  mediatorRdfResolveHypermedia: Mediator<Actor<IActionRdfResolveHypermedia, IActorTest,
  IActorRdfResolveHypermediaOutput>, IActionRdfResolveHypermedia, IActorTest, IActorRdfResolveHypermediaOutput>;
  /**
   * The hypermedia links resolve mediator
   */
  mediatorRdfResolveHypermediaLinks: Mediator<Actor<IActionRdfResolveHypermediaLinks, IActorTest,
  IActorRdfResolveHypermediaLinksOutput>, IActionRdfResolveHypermediaLinks, IActorTest,
  IActorRdfResolveHypermediaLinksOutput>;
  // TODO: make the following mandatory upon the next breaking change
  /**
   * The hypermedia links queue resolve mediator
   */
  mediatorRdfResolveHypermediaLinksQueue?: Mediator<Actor<IActionRdfResolveHypermediaLinksQueue,
  IActorTest, IActorRdfResolveHypermediaLinksQueueOutput>, IActionRdfResolveHypermediaLinksQueue, IActorTest,
  IActorRdfResolveHypermediaLinksQueueOutput>;
}
