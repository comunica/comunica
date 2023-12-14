import type { MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataAccumulate,
  IActionRdfMetadataAccumulateAppend } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { MediatorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import type { IActionRdfResolveQuadPattern,
  IQuadSource, IActorRdfResolveQuadPatternArgs } from '@comunica/bus-rdf-resolve-quad-pattern';
import {
  ActorRdfResolveQuadPatternSource, getContextSource,
  getContextSourceUrl,
  getDataSourceType, hasContextSingleSource,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { LRUCache } from 'lru-cache';
import type { Algebra } from 'sparqlalgebrajs';
import { MediatedQuadSource } from './MediatedQuadSource';

/**
 * A comunica Hypermedia RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternHypermedia extends ActorRdfResolveQuadPatternSource
  implements IActorRdfResolveQuadPatternHypermediaArgs {
  public readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  public readonly mediatorMetadata: MediatorRdfMetadata;
  public readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  public readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  public readonly mediatorRdfResolveHypermedia: MediatorRdfResolveHypermedia;
  public readonly mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  public readonly mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
  public readonly cacheSize: number;
  public readonly cache?: LRUCache<string, MediatedQuadSource>;
  public readonly httpInvalidator: ActorHttpInvalidateListenable;
  public readonly maxIterators: number;
  public readonly aggregateStore: boolean;

  public constructor(args: IActorRdfResolveQuadPatternHypermediaArgs) {
    super(args);
    this.cache = this.cacheSize ? new LRUCache<string, any>({ max: this.cacheSize }) : undefined;
    const cache = this.cache;
    if (cache) {
      this.httpInvalidator.addInvalidateListener(
        ({ url }: IActionHttpInvalidate) => url ? cache.delete(url) : cache.clear(),
      );
    }

    // TODO: remove this backwards-compatibility in the next major version, and make the param mandatory
    if (!args.mediatorMetadataAccumulate) {
      this.mediatorMetadataAccumulate = <any>{
        async mediate(action: IActionRdfMetadataAccumulateAppend) {
          // 'initialize' mode is not used in this actor, so we can assume 'append'.
          return { metadata: { ...action.accumulatedMetadata, ...action.appendingMetadata }};
        },
      };
    }
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    const sources = hasContextSingleSource(action.context);
    if (!sources) {
      throw new Error(`Actor ${this.name} can only resolve quad pattern queries against a single source.`);
    }
    return true;
  }

  protected getSource(context: IActionContext, operation: Algebra.Pattern): Promise<IQuadSource> {
    const contextSource = getContextSource(context)!;
    const url = getContextSourceUrl(contextSource)!;
    let source: MediatedQuadSource;

    // Try to read from cache
    if (this.cache && this.cache.has(url)) {
      source = this.cache.get(url)!;
    } else {
      // If not in cache, create a new source
      source = new MediatedQuadSource(
        this.cacheSize,
        url,
        getDataSourceType(contextSource),
        this.maxIterators,
        this.aggregateStore,
        {
          mediatorMetadata: this.mediatorMetadata,
          mediatorMetadataExtract: this.mediatorMetadataExtract,
          mediatorMetadataAccumulate: this.mediatorMetadataAccumulate,
          mediatorDereferenceRdf: this.mediatorDereferenceRdf,
          mediatorRdfResolveHypermedia: this.mediatorRdfResolveHypermedia,
          mediatorRdfResolveHypermediaLinks: this.mediatorRdfResolveHypermediaLinks,
          mediatorRdfResolveHypermediaLinksQueue: this.mediatorRdfResolveHypermediaLinksQueue,
        },
      );

      // If cache is not disabled
      // Set in cache
      if (this.cache && !context.get(KeysInitQuery.disableCaching)) {
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
   * The maximum number of links that can be followed in parallel.
   * @default {64}
   */
  maxIterators: number;
  /**
   * If all discovered quads across all links from a seed source should be indexed in an aggregated store,
   * to speed up later calls.
   * This should only be used for sources without filter factor.
   * @default {false}
   */
  aggregateStore: boolean;
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
   * The metadata accumulate mediator
   */
  mediatorMetadataAccumulate?: MediatorRdfMetadataAccumulate;
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
