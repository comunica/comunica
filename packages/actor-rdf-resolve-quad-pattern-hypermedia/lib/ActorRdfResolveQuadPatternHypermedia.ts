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
  cacheSize: number;
  httpInvalidator: ActorHttpInvalidateListenable;
  mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest,
  IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
  IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
  IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;
  mediatorRdfResolveHypermedia: Mediator<Actor<IActionRdfResolveHypermedia, IActorTest,
  IActorRdfResolveHypermediaOutput>, IActionRdfResolveHypermedia, IActorTest, IActorRdfResolveHypermediaOutput>;
  mediatorRdfResolveHypermediaLinks: Mediator<Actor<IActionRdfResolveHypermediaLinks, IActorTest,
  IActorRdfResolveHypermediaLinksOutput>, IActionRdfResolveHypermediaLinks, IActorTest,
  IActorRdfResolveHypermediaLinksOutput>;
}
