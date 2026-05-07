import type { IActionDereference } from '@comunica/bus-dereference';
import type { IActionHttp } from '@comunica/bus-http';
import type { ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';
import { ActorDereferenceHttpBase } from './ActorDereferenceHttpBase';

/**
 * A wrapper around an HTTP request cache policy that exposes it as a dereference cache policy.
 */
export class DereferenceCachePolicyHttpWrapper implements ICachePolicy<IActionDereference> {
  /**
   * @param cachePolicy The HTTP cache policy to wrap.
   * @param maxAcceptHeaderLength The maximum Accept header length for building request headers.
   */
  public constructor(
    private readonly cachePolicy: ICachePolicy<IActionHttp>,
    private readonly maxAcceptHeaderLength: number,
  ) {}

  /**
   * Checks whether the response is storable in a cache.
   * @return True if the response can be cached.
   */
  public storable(): boolean {
    return this.cachePolicy.storable();
  }

  /**
   * Checks whether the cached response satisfies the given action without revalidation.
   * @param action The dereference action to check against.
   * @return True if the cache can serve this request without revalidation.
   */
  public async satisfiesWithoutRevalidation(action: IActionDereference): Promise<boolean> {
    return this.cachePolicy.satisfiesWithoutRevalidation({
      input: action.url,
      init: {
        headers: await ActorDereferenceHttpBase.establishAcceptHeader(action, this.maxAcceptHeaderLength),
        method: action.method,
      },
      context: action.context,
    });
  }

  /**
   * Returns the cached response headers.
   * @return The response headers.
   */
  public responseHeaders(): Headers {
    return this.cachePolicy.responseHeaders();
  }

  /**
   * Returns the time-to-live of the cached response in milliseconds.
   * @return The TTL value.
   */
  public timeToLive(): number {
    return this.cachePolicy.timeToLive();
  }

  /**
   * Builds revalidation headers for the given dereference action.
   * @param newAction The dereference action requiring revalidation.
   * @return The revalidation request headers.
   */
  public async revalidationHeaders(newAction: IActionDereference): Promise<Headers> {
    return this.cachePolicy.revalidationHeaders({
      input: newAction.url,
      init: {
        headers: await ActorDereferenceHttpBase.establishAcceptHeader(newAction, this.maxAcceptHeaderLength),
        method: newAction.method,
      },
      context: newAction.context,
    });
  }

  /**
   * Produces an updated cache policy after revalidation with the server.
   * @param revalidationAction The dereference action used for revalidation.
   * @param revalidationResponse The server's revalidation response head.
   * @return The updated revalidation policy.
   */
  public async revalidatedPolicy(
    revalidationAction: IActionDereference,
    revalidationResponse: ICacheResponseHead,
  ): Promise<IRevalidationPolicy<IActionDereference>> {
    const revalidatedPolicy = await this.cachePolicy.revalidatedPolicy(
      {
        input: revalidationAction.url,
        init: {
          headers: await ActorDereferenceHttpBase.establishAcceptHeader(revalidationAction, this.maxAcceptHeaderLength),
          method: revalidationAction.method,
        },
        context: revalidationAction.context,
      },
      revalidationResponse,
    );
    return {
      policy: new DereferenceCachePolicyHttpWrapper(revalidatedPolicy.policy, this.maxAcceptHeaderLength),
      modified: revalidatedPolicy.modified,
      matches: revalidatedPolicy.matches,
    };
  }
}
