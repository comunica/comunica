import type { MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IActionContext } from '@comunica/types';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import type { IJsonLdContext } from 'jsonld-context-parser';
import { FetchDocumentLoader } from 'jsonld-context-parser';
import type { LRUCache } from 'lru-cache';

/**
 * A JSON-LD document loader that fetches over an HTTP bus using a given mediator.
 */
export class DocumentLoaderMediated extends FetchDocumentLoader {
  private readonly context: IActionContext;
  private readonly lastCachePolicies: Record<string, (context: IActionContext) => Promise<boolean>>;
  private readonly cache: DocumentLoaderMediatedCache | undefined;

  public constructor(
    mediatorHttp: MediatorHttp,
    context: IActionContext,
    cache: DocumentLoaderMediatedCache | undefined,
    lastCachePolicies: Record<string, (context: IActionContext) => Promise<boolean>> = {},
  ) {
    super(DocumentLoaderMediated.createFetcher(mediatorHttp, context, lastCachePolicies));
    this.context = context;
    this.lastCachePolicies = lastCachePolicies;
    this.cache = cache;
  }

  protected static createFetcher(
    mediatorHttp: MediatorHttp,
    context: IActionContext,
    lastCachePolicies: Record<string, (context: IActionContext) => Promise<boolean>>,
  ):
    (input: RequestInfo, init: RequestInit) => Promise<Response> {
    return async(url: RequestInfo, init: RequestInit) => {
      const response = await mediatorHttp.mediate({ input: url, init, context });
      if (response.cachePolicy) {
        lastCachePolicies[<string> url] = (context: IActionContext) => response
          .cachePolicy!.satisfiesWithoutRevalidation({ input: url, init, context });
      }
      response.json = async() => JSON.parse(await stringifyStream(ActorHttp.toNodeReadable(response.body)));
      return response;
    };
  }

  public override async load(url: string): Promise<IJsonLdContext> {
    const cache = this.cache;
    if (cache) {
      const cached = cache.get(url);
      if (cached) {
        if (cached.isStillValid && await cached.isStillValid(this.context)) {
          return cached.context;
        }
        cache.delete(url);
      }
    }
    const loaded = await super.load(url);
    this.cache?.set(url, { context: loaded, isStillValid: this.lastCachePolicies[url] });
    return loaded;
  }
}

export type DocumentLoaderMediatedCache = LRUCache<string, {
  context: IJsonLdContext;
  isStillValid: ((context: IActionContext) => Promise<boolean>) | undefined;
}>;
