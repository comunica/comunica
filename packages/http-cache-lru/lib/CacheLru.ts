import { Request } from 'cross-fetch';
import * as CachePolicy from 'http-cache-semantics';
import * as LRU from 'lru-cache';
import {
  addHashHeadersToObject,
  requestToRequestWithHashHeaders,
  responseToRequestWithHashHeaders,
} from './headerConversionHelpers';
import type { ICacheLruOptions } from './ICacheLruOptions';
import {
  applyCacheLruOptionsDefaults,
} from './ICacheLruOptions';
import type { IPolicyResponse } from './IPolicyResponse';

type Fetch = (
  input: RequestInfo,
  init?: RequestInit | undefined
) => Promise<Response>;

/**
 * An LRU Implementation of Cache
 */
export class CacheLru implements Cache {
  private readonly cache: LRU<string, IPolicyResponse>;
  private fetch: Fetch;

  public constructor(optionsInput?: ICacheLruOptions) {
    const options = applyCacheLruOptionsDefaults(optionsInput);
    this.cache = new LRU(options.lruOptions);
    this.fetch = options.fetch;
  }

  /**
   * The add() method of the Cache interface takes a URL, retrieves it, and adds
   * the resulting response object to the given cache.
   * @param request The request you want to add to the cache. This can be a
   * Request object or a URL.
   */
  public async add(_request: RequestInfo): Promise<void> {
    throw new Error('Not Implemented');
  }

  /**
   * The addAll() method of the Cache interface takes an array of URLs,
   * retrieves them, and adds the resulting response objects to the given cache.
   * The request objects created during retrieval become keys to the stored
   * response operations.
   * @param requests An array of string URLs that you want to be fetched and
   * added to the cache. You can specify the Request object instead of the URL.
   */
  public async addAll(_requests: RequestInfo[]): Promise<void> {
    throw new Error('Not Implemented');
  }

  /**
   * The delete() method of the Cache interface finds the Cache entry whose key
   * is the request, and if found, deletes the Cache entry and returns a Promise
   * that resolves to true. If no Cache entry is found, it resolves to false.
   * @param request The Request you are looking to delete. This can be a Request
   * object or a URL.
   * @param options An object whose properties control how matching is done in
   * the delete operation.
   * @returns a Promise that resolves to true if the cache entry is deleted, or
   * false otherwise.
   */
  public async delete(
    requestInfo: RequestInfo,
    _options?: CacheQueryOptions,
  ): Promise<boolean> {
    return this.cache.delete(new Request(requestInfo).url);
  }

  /**
   * The keys() method of the Cache interface returns a Promise that resolves to
   * an array ofRequest objects representing the keys of the Cache.
   * @param request The Request want to return, if a specific key is desired.
   * This can be a Request object or a URL.
   * @param options An object whose properties control how matching is done in
   * the keys operation.
   * @returns A Promise that resolves to an array of Request objects.
   */
  public async keys(
    _requestInfo?: RequestInfo,
    _options?: CacheQueryOptions,
  ): Promise<readonly Request[]> {
    return [ ...this.cache.keys() ].map(key => new Request(key));
  }

  /**
   * The match() method of the Cache interface returns a Promise that resolves
   * to the Response associated with the first matching request in the Cache
   * object. If no match is found, the Promise resolves to undefined.
   * @param request The Request for which you are attempting to find responses
   * in the Cache. This can be a Request object or a URL.
   * @param options An object that sets options for the match operation.
   * @returns A Promise that resolves to the first Response that matches the
   * request or to undefined if no match is found.
   */
  public async match(
    request: RequestInfo,
    _options?: CacheQueryOptions,
  ): Promise<Response | undefined> {
    const newRequest = new Request(request);
    const cacheResult = this.cache.get(newRequest.url);
    // Nothing is in the cache
    if (!cacheResult) {
      const response = await this.fetch(newRequest);
      await this.put(newRequest, response);
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
      const newResponse = await this.fetch(newRequest);
      const { policy, modified } = oldPolicy.revalidatedPolicy(
        requestToRequestWithHashHeaders(newRequest),
        responseToRequestWithHashHeaders(newResponse),
      );
      const response = modified ? newResponse : oldResponse;
      this.cache.set(
        newRequest.url,
        { policy, response },
        { ttl: policy.timeToLive() },
      );
      return response.clone();
    }
    return oldResponse.clone();
  }

  /**
   * The matchAll() method of the Cache interface returns a Promise that
   * resolves to an array of all matching responses in the Cache object.
   * @param request The Request for which you are attempting to find responses
   * in the Cache. This can be a Request object or a URL. If this argument is
   * omitted, you will get a copy of all responses in this cache.
   * @param options An options object allowing you to set specific control
   * options for the matching performed.
   * @returns A Promise that resolves to an array of all matching responses in
   * the Cache object.
   */
  public async matchAll(
    _requestInfo?: RequestInfo,
    _options?: CacheQueryOptions,
  ): Promise<readonly Response[]> {
    throw new Error('Not Implemented');
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
    this.cache.set(
      request.url,
      { policy, response },
      { ttl: policy.timeToLive() },
    );
  }

  /**
   * Set the fetch object used in the cache. This method is not spec compliant
   * @param fetch A fetch function
   */
  public setFetch(fetch: Fetch): void {
    this.fetch = fetch;
  }

  /**
   * Check to see if the cache contains a fresh response. This method is not
   * spec compliant
   * @param request The request
   */
  public has(request: Request): boolean {
    const cacheResult = this.cache.get(request.url);
    if (cacheResult) {
      const { policy, response } = cacheResult;
      return policy.satisfiesWithoutRevalidation(
        requestToRequestWithHashHeaders(request),
      );
    }
    return false;
  }
}
