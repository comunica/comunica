import * as CachePolicy from 'http-cache-semantics';
import {
  addHashHeadersToObject,
  responseToRequestWithHashHeaders,
  requestToRequestWithHashHeaders,
} from './headerConversionHelpers';
import type { IHttpCacheStorage } from './IHttpCacheStorage';

export class CacheSemanticsHandler {
  private readonly cacheStorage: IHttpCacheStorage;

  public constructor(cacheStorage: IHttpCacheStorage) {
    this.cacheStorage = cacheStorage;
  }

  /**
   * Fetches a request from the cache or from the web if it is not present in
   * the cache.
   * @param request The Request for which you are attempting to find responses
   * in the Cache. This can be a Request object or a URL.
   * @param options An object that sets options for the match operation.
   * @returns A Promise that resolves to the first Response that matches the
   * request.
   */
  public async fetchWithCache(
    request: RequestInfo,
    fetch: (
      input: RequestInfo,
      init?: RequestInit
    ) => Promise<Response>,
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
      addHashHeadersToObject(
        oldPolicy.revalidationHeaders(newRequestWithHashHeaders),
        newRequest,
      );
      // Fetch again with new headers
      const newResponse = await fetch(newRequest);
      const { policy, modified } = oldPolicy.revalidatedPolicy(
        requestToRequestWithHashHeaders(newRequest),
        responseToRequestWithHashHeaders(newResponse),
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
    const responseWithHashHeaders = responseToRequestWithHashHeaders(response);
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
