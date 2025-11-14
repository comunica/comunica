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
  private readonly mediatorHttp: MediatorHttp;
  private readonly context: IActionContext;
  private readonly lastCachePolicies: Record<string, () => Promise<boolean>>;
  private readonly cache: LRUCache<string, {
    context: IJsonLdContext;
    isStillValid: (() => Promise<boolean>) | undefined;
  }>;

  public constructor(
    mediatorHttp: MediatorHttp,
    context: IActionContext,
    cache: LRUCache<string, { context: IJsonLdContext; isStillValid: (() => Promise<boolean>) | undefined }>,
    lastCachePolicies: Record<string, () => Promise<boolean>> = {},
  ) {
    super(DocumentLoaderMediated.createFetcher(mediatorHttp, context, lastCachePolicies));
    this.mediatorHttp = mediatorHttp;
    this.context = context;
    this.lastCachePolicies = lastCachePolicies;
    this.cache = cache;
  }

  protected static createFetcher(
    mediatorHttp: MediatorHttp,
    context: IActionContext,
    lastCachePolicies: Record<string, () => Promise<boolean>>,
  ):
    (input: RequestInfo, init: RequestInit) => Promise<Response> {
    return async(url: RequestInfo, init: RequestInit) => {
      const response = await mediatorHttp.mediate({ input: url, init, context });
      if (response.cachePolicy) {
        // console.log(await response.cachePolicy.satisfiesWithoutRevalidation(new Request(url, init)));
        lastCachePolicies[typeof url === 'string' ? url : url.url] =
          () => response.cachePolicy!.satisfiesWithoutRevalidation(new Request(url, init));
      }
      response.json = async() => JSON.parse(await stringifyStream(ActorHttp.toNodeReadable(response.body)));
      return response;
    };
  }

  public override async load(url: string): Promise<IJsonLdContext> {
    const cached = this.cache.get(url);
    if (cached) {
      if (cached.isStillValid && !(await cached.isStillValid())) {
        console.log('NO: ' + url);
        this.cache.delete(url);
      } else {
        console.log('HIT!');
        return cached.context;
      }
    }
    const loaded = await super.load(url);
    this.cache.set(url, { context: loaded, isStillValid: this.lastCachePolicies[url] });
    return loaded;
  }
}
