import { ActorHttp } from '@comunica/bus-http';
import type { ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';

// eslint-disable-next-line ts/no-require-imports
import CachePolicy = require('http-cache-semantics');
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

/**
 * Wrapper over the cache policy of http-cache-semantics to expose it as an ICachePolicy.
 */
export class CachePolicyHttpCacheSemanticsWrapper implements ICachePolicy<Request> {
  public constructor(
    private readonly cachePolicy: CachePolicy,
    private readonly fetchInitPreprocessor: IFetchInitPreprocessor,
  ) {}

  public storable(): boolean {
    return this.cachePolicy.storable();
  }

  public async satisfiesWithoutRevalidation(action: Request): Promise<boolean> {
    return this.cachePolicy
      .satisfiesWithoutRevalidation(CachePolicyHttpCacheSemanticsWrapper.convertFromFetchRequest(new Request(action, await this.fetchInitPreprocessor.handle(action)))); // TODO: call this fetchInitPreprocessor in other places as well?
  }

  public responseHeaders(): Headers {
    return CachePolicyHttpCacheSemanticsWrapper.convertToFetchHeaders(this.cachePolicy.responseHeaders());
  }

  public timeToLive(): number {
    return this.cachePolicy.timeToLive();
  }

  public async revalidationHeaders(newAction: Request): Promise<Headers> {
    return CachePolicyHttpCacheSemanticsWrapper.convertToFetchHeaders(this.cachePolicy
      .revalidationHeaders(CachePolicyHttpCacheSemanticsWrapper.convertFromFetchRequest(newAction)));
  }

  public async revalidatedPolicy(
    revalidationAction: Request,
    revalidationResponse: ICacheResponseHead,
  ): Promise<IRevalidationPolicy<Request>> {
    const revalidatedPolicy = this.cachePolicy.revalidatedPolicy(
      CachePolicyHttpCacheSemanticsWrapper.convertFromFetchRequest(revalidationAction),
      {
        status: revalidationResponse.status,
        headers: revalidationResponse.headers ? ActorHttp.headersToHash(revalidationResponse.headers) : {},
      },
    );
    return {
      policy: new CachePolicyHttpCacheSemanticsWrapper(revalidatedPolicy.policy),
      modified: revalidatedPolicy.modified,
      matches: revalidatedPolicy.matches,
    };
  }

  public static convertFromFetchRequest(request: Request): CachePolicy.Request {
    return {
      url: request.url,
      method: request.method,
      headers: ActorHttp.headersToHash(request.headers),
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
