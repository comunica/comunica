import { ActorHttp, type IActionHttp } from '@comunica/bus-http';
import { KeysInitQuery } from '@comunica/context-entries';
import type { ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';

// eslint-disable-next-line ts/no-require-imports
import CachePolicy = require('http-cache-semantics');
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

/**
 * Wrapper over the cache policy of http-cache-semantics to expose it as an ICachePolicy.
 */
export class CachePolicyHttpCacheSemanticsWrapper implements ICachePolicy<IActionHttp> {
  /**
   * Creates a new cache policy wrapper.
   * @param cachePolicy The underlying http-cache-semantics policy.
   * @param queryTimestamp The high-resolution timestamp of the current query execution.
   * @param fetchInitPreprocessor The fetch init preprocessor for request conversion.
   */
  public constructor(
    private readonly cachePolicy: CachePolicy,
    private readonly queryTimestamp: number | undefined,
    private readonly fetchInitPreprocessor: IFetchInitPreprocessor,
  ) {}

  /**
   * Checks whether the response is cacheable.
   * @return True if the response can be stored in a cache.
   */
  public storable(): boolean {
    return this.cachePolicy.storable();
  }

  /**
   * Determines whether a cached response can satisfy the given request without revalidation.
   * @param action The HTTP action to check against the cache policy.
   * @return True if the cached response is still valid for this request.
   */
  public async satisfiesWithoutRevalidation(action: IActionHttp): Promise<boolean> {
    // We always allow full caching within the context of a single query execution
    if (this.queryTimestamp && action.context.get(KeysInitQuery.queryTimestampHighResolution) === this.queryTimestamp) {
      return true;
    }
    // Otherwise, determine through cache policy
    return this.cachePolicy.satisfiesWithoutRevalidation(await CachePolicyHttpCacheSemanticsWrapper
      .convertFromFetchRequest(action, this.fetchInitPreprocessor));
  }

  /**
   * Returns the response headers as adjusted by the cache policy.
   * @return The Fetch API Headers for the cached response.
   */
  public responseHeaders(): Headers {
    return CachePolicyHttpCacheSemanticsWrapper.convertToFetchHeaders(this.cachePolicy.responseHeaders());
  }

  /**
   * Returns the remaining time-to-live of the cached response in milliseconds.
   * @return The number of milliseconds until the cached response expires.
   */
  public timeToLive(): number {
    return this.cachePolicy.timeToLive();
  }

  /**
   * Produces conditional headers for cache revalidation of the given request.
   * @param newAction The HTTP action requiring revalidation.
   * @return Headers containing conditional validators such as If-None-Match.
   */
  public async revalidationHeaders(newAction: IActionHttp): Promise<Headers> {
    return CachePolicyHttpCacheSemanticsWrapper.convertToFetchHeaders(this.cachePolicy
      .revalidationHeaders(await CachePolicyHttpCacheSemanticsWrapper
        .convertFromFetchRequest(newAction, this.fetchInitPreprocessor)));
  }

  /**
   * Produces an updated cache policy after a revalidation response.
   * @param revalidationAction The HTTP action used for revalidation.
   * @param revalidationResponse The response head received from revalidation.
   * @return The updated revalidation policy including whether the response was modified.
   */
  public async revalidatedPolicy(
    revalidationAction: IActionHttp,
    revalidationResponse: ICacheResponseHead,
  ): Promise<IRevalidationPolicy<IActionHttp>> {
    const revalidatedPolicy = this.cachePolicy.revalidatedPolicy(
      await CachePolicyHttpCacheSemanticsWrapper
        .convertFromFetchRequest(revalidationAction, this.fetchInitPreprocessor),
      {
        status: revalidationResponse.status,
        headers: revalidationResponse.headers ? ActorHttp.headersToHash(revalidationResponse.headers) : {},
      },
    );
    return {
      policy: new CachePolicyHttpCacheSemanticsWrapper(
        revalidatedPolicy.policy,
        this.queryTimestamp,
        this.fetchInitPreprocessor,
      ),
      modified: revalidatedPolicy.modified,
      matches: revalidatedPolicy.matches,
    };
  }

  /**
   * Converts a Fetch API HTTP action into an http-cache-semantics request object.
   * @param request The HTTP action to convert.
   * @param fetchInitPreprocessor The preprocessor to apply to request init.
   * @return A cache-semantics-compatible request.
   */
  public static async convertFromFetchRequest(
    request: IActionHttp,
    fetchInitPreprocessor: IFetchInitPreprocessor,
  ): Promise<CachePolicy.Request> {
    let headers = typeof request.input === 'string' ? request.init?.headers : request.input.headers;
    headers = (await fetchInitPreprocessor.handle({ headers }, request.context)).headers;
    return {
      url: typeof request.input === 'string' ? request.input : request.input.url,
      method: request.init?.method ?? 'GET',
      headers: headers ? ActorHttp.headersToHash(new Headers(headers)) : {},
    };
  }

  /**
   * Converts http-cache-semantics headers to Fetch API Headers.
   * @param headers The cache-semantics header object.
   * @return A Fetch API Headers instance.
   */
  public static convertToFetchHeaders(headers: CachePolicy.Headers): Headers {
    const fetchHeaders = new Headers();
    for (const [ key, value ] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        for (const valueEntry of value) {
          fetchHeaders.append(key, valueEntry);
        }
      } else if (value) {
        fetchHeaders.append(key, value);
      }
    }
    return fetchHeaders;
  }
}
