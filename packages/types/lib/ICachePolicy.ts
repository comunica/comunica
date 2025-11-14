/**
 * A cache policy represents the policy under which certain data can be cached.
 * This is a generalization of the CachePolicy interface from the http-cache-semantics npm package.
 * @param <I> The type of input request this policy applies to.
 */
export interface ICachePolicy<I> {
  /**
   * Returns true if the response can be stored in a cache.
   * If it's false then you MUST NOT store either the request or the response.
   */
  storable: () => boolean;

  /**
   * This is the most important method. Use this method to check whether a cached response is still fresh in the
   * context of the new request.
   *
   * If it returns true, then the given request matches the original response this cache policy has been created with,
   * and the response can be reused without contacting the server. Note that the old response can't be returned without
   * being updated, see responseHeaders().
   *
   * If it returns false, then the response may not be matching at all (e.g. it's for a different URL or method),
   * or may require to be refreshed first (see revalidationHeaders()).
   *
   * @param input The new input request.
   */
  satisfiesWithoutRevalidation: (input: I) => Promise<boolean>;

  /**
   * Returns updated, filtered set of response headers to return to clients receiving the cached response.
   * This function is necessary, because proxies MUST always remove hop-by-hop headers (such as TE and Connection) and
   * update response's Age to avoid doubling cache time.
   * Example:
   * `cachedResponse.headers = cachePolicy.responseHeaders(cachedResponse);`
   */
  responseHeaders: () => Headers;

  /**
   * Returns approximate time in milliseconds until the response becomes stale (i.e. not fresh).
   *
   * After that time (when `timeToLive() <= 0`) the response might not be usable without revalidation. However,
   * there are exceptions, e.g. a client can explicitly allow stale responses, so always check with
   * `satisfiesWithoutRevalidation()`.
   */
  timeToLive: () => number;

  /**
   * Returns updated, filtered set of request headers to send to the origin server to check if the cached
   * response can be reused. These headers allow the origin server to return status 304 indicating the
   * response is still fresh. All headers unrelated to caching are passed through as-is.
   *
   * Use this method when updating cache from the origin server.
   *
   * @example
   * updateRequest.headers = cachePolicy.revalidationHeaders(updateRequest);
   */
  revalidationHeaders: (newInput: I) => Promise<Headers>;

  /**
   * Use this method to update the cache after receiving a new response from the origin server.
   */
  revalidatedPolicy: (
    revalidationInput: I,
    revalidationResponse: ICacheResponseHead,
  ) => Promise<IRevalidationPolicy<I>>;
}

export interface IRevalidationPolicy<I> {
  /**
   * A new `ICachePolicy` with HTTP headers updated from `revalidationResponse`. You can always replace
   * the old cached `ICachePolicy` with the new one.
   */
  policy: ICachePolicy<I>;
  /**
   * Boolean indicating whether the response body has changed.
   *
   * - If `false`, then a valid 304 Not Modified response has been received, and you can reuse the old
   * cached response body.
   * - If `true`, you should use new response's body (if present), or make another request to the origin
   * server without any conditional headers (i.e. don't use `revalidationHeaders()` this time) to get
   * the new resource.
   */
  modified: boolean;
  matches: boolean;
}

export interface ICacheResponseHead {
  /**
   * The HTTP status code.
   */
  status: number;
  /**
   * The returned headers of the final URL.
   */
  headers?: Headers;
}
