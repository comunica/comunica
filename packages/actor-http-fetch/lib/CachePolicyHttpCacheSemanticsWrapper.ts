import { ActorHttp, type IActionHttp } from '@comunica/bus-http';
import { KeysInitQuery } from '@comunica/context-entries';
import type { ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';

// eslint-disable-next-line ts/no-require-imports
import CachePolicy = require('http-cache-semantics');

/**
 * Wrapper over the cache policy of http-cache-semantics to expose it as an ICachePolicy.
 */
export class CachePolicyHttpCacheSemanticsWrapper implements ICachePolicy<IActionHttp> {
  public constructor(
    private readonly cachePolicy: CachePolicy,
    private readonly queryTimestamp: number | undefined,
  ) {}

  public storable(): boolean {
    return this.cachePolicy.storable();
  }

  public async satisfiesWithoutRevalidation(action: IActionHttp): Promise<boolean> {
    // We always allow full caching within the context of a single query execution
    if (this.queryTimestamp && action.context.get(KeysInitQuery.queryTimestampHighResolution) === this.queryTimestamp) {
      return true;
    }
    // Otherwise, determine through cache policy
    return this.cachePolicy
      .satisfiesWithoutRevalidation(CachePolicyHttpCacheSemanticsWrapper.convertFromFetchRequest(action));
  }

  public responseHeaders(): Headers {
    return CachePolicyHttpCacheSemanticsWrapper.convertToFetchHeaders(this.cachePolicy.responseHeaders());
  }

  public timeToLive(): number {
    return this.cachePolicy.timeToLive();
  }

  public async revalidationHeaders(newAction: IActionHttp): Promise<Headers> {
    return CachePolicyHttpCacheSemanticsWrapper.convertToFetchHeaders(this.cachePolicy
      .revalidationHeaders(CachePolicyHttpCacheSemanticsWrapper.convertFromFetchRequest(newAction)));
  }

  public async revalidatedPolicy(
    revalidationAction: IActionHttp,
    revalidationResponse: ICacheResponseHead,
  ): Promise<IRevalidationPolicy<IActionHttp>> {
    const revalidatedPolicy = this.cachePolicy.revalidatedPolicy(
      CachePolicyHttpCacheSemanticsWrapper.convertFromFetchRequest(revalidationAction),
      {
        status: revalidationResponse.status,
        headers: revalidationResponse.headers ? ActorHttp.headersToHash(revalidationResponse.headers) : {},
      },
    );
    return {
      policy: new CachePolicyHttpCacheSemanticsWrapper(revalidatedPolicy.policy, this.queryTimestamp),
      modified: revalidatedPolicy.modified,
      matches: revalidatedPolicy.matches,
    };
  }

  public static convertFromFetchRequest(request: IActionHttp): CachePolicy.Request {
    const headers = typeof request.input === 'string' ? request.init?.headers : request.input.headers;
    return {
      url: typeof request.input === 'string' ? request.input : request.input.url,
      method: request.init?.method ?? 'GET',
      headers: headers ? ActorHttp.headersToHash(new Headers(headers)) : {},
    };
  }

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
