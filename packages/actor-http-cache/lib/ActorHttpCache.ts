import type {
  IActionHttp,
  IActorHttpOutput,
  IActorHttpArgs,
  MediatorHttp,
} from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { Readable } from 'stream';

import type {
  ActorHttpInvalidateListenable,
  IActionHttpInvalidate,
  MediatorHttpInvalidate,
} from '@comunica/bus-http-invalidate';
import { KeysHttpCache } from '@comunica/context-entries';
import type { IHttpCacheStorage } from '@comunica/http-cache-storage';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import type {
  Request as CacheRequest,
  Response as CacheResponse,
  RevalidationPolicy,
} from 'http-cache-semantics';
import 'cross-fetch/polyfill';
import CachePolicy = require('http-cache-semantics');

/**
 * A comunica Cache Http Actor.
 */
export class ActorHttpCache extends ActorHttp {
  private readonly cacheStorage: IHttpCacheStorage;
  private readonly mediatorHttpInvalidate: MediatorHttpInvalidate;
  private readonly mediatorHttp: MediatorHttp;

  public constructor(args: IActorHttpCacheArgs) {
    super(args);
    this.cacheStorage = args.cacheStorage;
    this.mediatorHttpInvalidate = args.mediatorHttpInvalidate;
    this.mediatorHttp = args.mediatorHttp;
    args.httpInvalidator.addInvalidateListener(
      ({ url }: IActionHttpInvalidate) =>
        url ?
          this.cacheStorage.delete(new Request(url)) :
          this.cacheStorage.clear(),
    );
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    if (await this.cacheStorage.has(new Request(action.input, action.init))) {
      return { time: 1 };
    }
    if (action.context.get(KeysHttpCache.doNotCheckHttpCache)) {
      throw new Error(`Actor ${this.name} skipped as cache should not be checked.`);
    }
    const newAction = {
      ...action,
      context: action.context.set(KeysHttpCache.doNotCheckHttpCache, true),
    };
    return await (await this.mediatorHttp.mediateActor(newAction)).test(newAction);
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    // Fetch data
    return await this.fetchWithCache(action);
  }

  /**
   * Fetches a request from the cache or from the web if it is not present in
   * the cache.
   * @param request The Request for which you are attempting to find responses
   * in the Cache. This can be a Request object or a URL.
   * @param options An object that sets options for the match operation.
   * @returns A Promise that resolves to the first Response that matches the
   * request and a boolean indicating if the value was from the cache or not
   */
  private async fetchWithCache(
    action: IActionHttp,
  ): Promise<Response> {
    const newRequest = new Request(action.input, action.init);
    const cacheResult = await this.cacheStorage.get(newRequest);
    // Request is not cached ===================================================
    if (!cacheResult) {
      // Make Request
      const response = await this.fetchDocument(action);
      // Create a Cache Policy
      const cachePolicy = this.newCachePolicy(newRequest, response);
      if (!cachePolicy.storable()) {
        return response;
      }
      return await this.teeAndCacheResponse(newRequest, response, cachePolicy);
    }
    // The Request is cached ===================================================
    // The Cache Policy is Satisfied -------------------------------------------
    if (this.isPolicySatisfied(newRequest, cacheResult.policy)) {
      return await this.teeAndCacheResponse(
        newRequest,
        new Response(cacheResult.body, cacheResult.init),
        cacheResult.policy,
      );
    }
    // The Cache Policy is not satisfied ---------------------------------------
    // Invalidate the cache
    await this.mediatorHttpInvalidate.mediate({ url: newRequest.url, context: action.context });
    const revalidationHeaders = this.getRevalidationHeaders(newRequest, cacheResult.policy);
    const response = await this.fetchDocument({
      ...action,
      init: {
        ...action.init,
        headers: revalidationHeaders,
      },
    });
    const { policy, modified } = this.getRevalidatedPolicy(newRequest, response, cacheResult.policy);
    const finalResponse = modified ? response : new Response(cacheResult.body, cacheResult.init);
    return await this.teeAndCacheResponse(newRequest, finalResponse, policy);
  }

  private async fetchDocument(action: IActionHttp): Promise<Response> {
    const response = await this.mediatorHttp.mediate({
      ...action,
      context: action.context.set(KeysHttpCache.doNotCheckHttpCache, true),
    });
    return response;
  }

  private newCachePolicy(request: Request, response: Response): CachePolicy {
    // Conversions to make headers compatible
    const requestWithHashHeaders = ActorHttpCache.requestToRequestWithHashHeaders(request);
    const responseWithHashHeaders = ActorHttpCache.responseToResponseWithHashHeaders(response);
    return new CachePolicy(
      requestWithHashHeaders,
      responseWithHashHeaders,
    );
  }

  private isPolicySatisfied(request: Request, policy: CachePolicy): boolean {
    const requestWithHashHeaders = ActorHttpCache.requestToRequestWithHashHeaders(request);
    return policy.satisfiesWithoutRevalidation(requestWithHashHeaders);
  }

  private getRevalidationHeaders(request: Request, policy: CachePolicy): Headers {
    const requestWithHashHeaders = ActorHttpCache.requestToRequestWithHashHeaders(request);
    const hashRevalidationHeaders = policy.revalidationHeaders(requestWithHashHeaders);
    return new Headers(<Record<string, string>> hashRevalidationHeaders);
  }

  private getRevalidatedPolicy(request: Request, response: Response, policy: CachePolicy): RevalidationPolicy {
    const requestWithHashHeaders = ActorHttpCache.requestToRequestWithHashHeaders(request);
    const responseWithHashHeaders = ActorHttpCache.responseToResponseWithHashHeaders(response);
    return policy.revalidatedPolicy(requestWithHashHeaders, responseWithHashHeaders);
  }

  private async teeAndCacheResponse(request: Request, response: Response, cachePolicy: CachePolicy): Promise<Response> {
    // Node-fetch does not support body.tee, while it is mandatory according to the fetch and readablestream api.
    // If it doesn't exist, we monkey-patch it.
    if (response.body && !response.body.tee) {
      response.body.tee = (): [ReadableStream, ReadableStream] => [
        // @ts-ignore
        Readable.from(response.body),
        // @ts-ignore
        Readable.from(response.body),
      ];
    }

    const [ bodyToRetrun, bodyToCache ] = response.body?.tee() || [ undefined, undefined ];
    const responseInit = {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    };
    await this.cacheStorage.set(
      request,
      {
        policy: cachePolicy,
        body: bodyToCache,
        init: responseInit,
      },
      cachePolicy.timeToLive(),
    );
    return new Response(bodyToRetrun, responseInit);
  }

  /**
   * ===========================================================================
   * Hash Header Converters
   * These exist because the cache semantics library only accepts old headers
   * ===========================================================================
   */

  public static requestToRequestWithHashHeaders(request: Request): CacheRequest {
    return { ...request, headers: this.headersToHash(request.headers) };
  }

  public static responseToResponseWithHashHeaders(response: Response): CacheResponse {
    return { ...response, headers: this.headersToHash(response.headers) };
  }
}

export interface IActorHttpCacheArgs extends IActorHttpArgs {
  /**
   * A storage object to be used by the cache
   */
  cacheStorage: IHttpCacheStorage;
  mediatorHttpInvalidate: MediatorHttpInvalidate;
  /* eslint-disable max-len */
  /**
   * An actor that listens to HTTP invalidation events
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^2.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /* eslint-enable max-len */
  mediatorHttp: MediatorHttp;
}
