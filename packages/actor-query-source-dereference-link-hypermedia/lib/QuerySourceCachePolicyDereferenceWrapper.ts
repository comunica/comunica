import type { IActionDereference } from '@comunica/bus-dereference';
import type { IActionQuerySourceDereferenceLink } from '@comunica/bus-query-source-dereference-link';
import type { ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';

/**
 * Wraps a dereference-level cache policy to adapt it for query source dereference link actions.
 */
export class QuerySourceCachePolicyDereferenceWrapper implements ICachePolicy<IActionQuerySourceDereferenceLink> {
  /**
   * Creates a new cache policy wrapper.
   * @param cachePolicy The underlying dereference cache policy.
   */
  public constructor(
    private readonly cachePolicy: ICachePolicy<IActionDereference>,
  ) {}

  /**
   * Checks whether the response is storable in a cache.
   * @return Whether the response is storable.
   */
  public storable(): boolean {
    return this.cachePolicy.storable();
  }

  /**
   * Checks whether the cached response satisfies the request without revalidation.
   * @param action The query source dereference link action.
   * @return Whether the cached response is still valid.
   */
  public async satisfiesWithoutRevalidation(action: IActionQuerySourceDereferenceLink): Promise<boolean> {
    return this.cachePolicy.satisfiesWithoutRevalidation({ url: action.link.url, context: action.context });
  }

  /**
   * Returns the response headers from the cached response.
   * @return The response headers.
   */
  public responseHeaders(): Headers {
    return this.cachePolicy.responseHeaders();
  }

  /**
   * Returns the remaining time-to-live in milliseconds for the cached response.
   * @return The time-to-live in milliseconds.
   */
  public timeToLive(): number {
    return this.cachePolicy.timeToLive();
  }

  /**
   * Returns the headers needed for cache revalidation.
   * @param newAction The query source dereference link action.
   * @return The revalidation request headers.
   */
  public async revalidationHeaders(newAction: IActionQuerySourceDereferenceLink): Promise<Headers> {
    return this.cachePolicy.revalidationHeaders({ url: newAction.link.url, context: newAction.context });
  }

  /**
   * Creates a revalidated cache policy from the revalidation response.
   * @param revalidationAction The query source dereference link action used for revalidation.
   * @param revalidationResponse The response head from the revalidation request.
   * @return The revalidated policy with modification status.
   */
  public async revalidatedPolicy(
    revalidationAction: IActionQuerySourceDereferenceLink,
    revalidationResponse: ICacheResponseHead,
  ): Promise<IRevalidationPolicy<IActionQuerySourceDereferenceLink>> {
    const revalidatedPolicy = await this.cachePolicy.revalidatedPolicy(
      { url: revalidationAction.link.url, context: revalidationAction.context },
      revalidationResponse,
    );
    return {
      policy: new QuerySourceCachePolicyDereferenceWrapper(revalidatedPolicy.policy),
      modified: revalidatedPolicy.modified,
      matches: revalidatedPolicy.matches,
    };
  }
}
