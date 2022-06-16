import type {
  IActionHttp,
  IActorHttpOutput,
  IActorHttpArgs,
} from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type {
  ActorHttpInvalidateListenable,
  IActionHttpInvalidate,
  MediatorHttpInvalidate,
} from '@comunica/bus-http-invalidate';
import { KeysHttp } from '@comunica/context-entries';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import type { IActionContext } from '@comunica/types';
import 'cross-fetch/polyfill';
import * as CachePolicy from 'http-cache-semantics';
import {
  requestToRequestWithHashHeaders,
  responseToResponseWithHashHeaders,
  addHashHeadersToObject,
} from './headerConversionHelpers';
import type { IHttpCacheStorage } from './IHttpCacheStorage';

/**
 * A comunica Cache Http Actor.
 */
export class ActorHttpCache extends ActorHttp {
  private readonly cacheStorage: IHttpCacheStorage;
  private readonly mediatorHttpInvalidate: MediatorHttpInvalidate;

  public constructor(args: IActorHttpCacheArgs) {
    super(args);
    this.cacheStorage = args.cacheStorage;
    this.mediatorHttpInvalidate = args.mediatorHttpInvalidate;
    args.httpInvalidator.addInvalidateListener(
      ({ url }: IActionHttpInvalidate) =>
        url ?
          this.cacheStorage.delete(new Request(url)) :
          this.cacheStorage.clear(),
    );
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    if (await this.has(new Request(action.input, action.init))) {
      return { time: 1 };
    }
    return { time: Number.POSITIVE_INFINITY };
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const customFetch: ((
      input: RequestInfo,
      init?: RequestInit
    ) => Promise<Response>) | undefined = action.context?.get(KeysHttp.fetch) || fetch;
    return await this.fetchWithCache(
      new Request(action.input, action.init),
      customFetch,
      action.context,
    );
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
  public async fetchWithCache(
    request: RequestInfo,
    fetch: (
      input: RequestInfo,
      init?: RequestInit
    ) => Promise<Response>,
    context: IActionContext,
  ): Promise<Response> {
    const newRequest = new Request(request);
    const cacheResult = await this.cacheStorage.get(newRequest);
    // Nothing is in the cache
    if (!cacheResult) {
      const response = await fetch(newRequest);
      try {
        await this.put(newRequest, response);
      } catch {
        // Do nothing if it is not storable
      }
      return response.clone();
      // Something is in the cache
    }
    // Check if the response is stale
    const oldPolicy = cacheResult.policy;
    const oldResponse = cacheResult.response;
    const newRequestWithHashHeaders = requestToRequestWithHashHeaders(
      new Request(newRequest),
    );
    // If the response is stale
    if (!oldPolicy.satisfiesWithoutRevalidation(newRequestWithHashHeaders)) {
      // Invaidate the cache if it must be refreshed
      await this.mediatorHttpInvalidate.mediate({ url: newRequest.url, context });
      addHashHeadersToObject(
        oldPolicy.revalidationHeaders(newRequestWithHashHeaders),
        newRequest,
      );
      // Fetch again with new headers
      const newResponse = await fetch(newRequest);
      const { policy, modified } = oldPolicy.revalidatedPolicy(
        requestToRequestWithHashHeaders(newRequest),
        responseToResponseWithHashHeaders(newResponse),
      );
      const response = modified ? newResponse : oldResponse;
      await this.cacheStorage.set(
        newRequest,
        { policy, response },
        policy.timeToLive(),
      );
      return response.clone();
    }
    return oldResponse.clone();
  }

  /**
   * The put() method of the Cache interface allows key/value pairs to be added
   * to the current Cache object.
   * @param request The Request object or URL that you want to add to the cache.
   * @param response The Response you want to match up to the request.
   */
  public async put(requestInfo: RequestInfo, response: Response): Promise<void> {
    const request = new Request(requestInfo);
    // Headers need to be converted to a hash because http-cache-semantics was
    // built for an older version of headers.
    const requestWithHashHeaders = requestToRequestWithHashHeaders(request);
    const responseWithHashHeaders = responseToResponseWithHashHeaders(response);
    const policy = new CachePolicy(
      requestWithHashHeaders,
      responseWithHashHeaders,
    );
    if (!policy.storable()) {
      throw new TypeError(`${request.url} is not storable.`);
    }
    // Set the cache
    await this.cacheStorage.set(
      request,
      { policy, response },
      policy.timeToLive(),
    );
  }

  /**
   * Checks if there is a fresh response cached
   * @param requestInfo The request mapped to the response
   * @returns true if there is a fresh response cached
   */
  public async has(requestInfo: RequestInfo): Promise<boolean> {
    const request = new Request(requestInfo);
    const cacheResult = await this.cacheStorage.get(new Request(request));
    if (cacheResult) {
      const { policy } = cacheResult;
      return policy.satisfiesWithoutRevalidation(
        requestToRequestWithHashHeaders(request),
      );
    }
    return false;
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
}
