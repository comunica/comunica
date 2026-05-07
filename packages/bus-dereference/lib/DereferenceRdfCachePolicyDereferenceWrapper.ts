import type { ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';
import type { IActionDereference } from './ActorDereference';

/**
 * Wraps a cache policy to inject media type information into dereference actions.
 */
export class DereferenceRdfCachePolicyDereferenceWrapper implements ICachePolicy<IActionDereference> {
  public constructor(
    private readonly cachePolicy: ICachePolicy<IActionDereference>,
    private readonly mediaTypes: () => Promise<Record<string, number> | undefined>,
  ) {}

  /**
   * Checks whether the response is storable in cache.
   * @return Whether the response can be cached.
   */
  public storable(): boolean {
    return this.cachePolicy.storable();
  }

  /**
   * Checks whether the cached response satisfies the action without revalidation.
   * @param action The dereference action to check.
   * @return Whether the cached response is still valid.
   */
  public async satisfiesWithoutRevalidation(action: IActionDereference): Promise<boolean> {
    return this.cachePolicy.satisfiesWithoutRevalidation({ ...action, mediaTypes: this.mediaTypes });
  }

  /**
   * Returns the response headers for caching.
   * @return The cached response headers.
   */
  public responseHeaders(): Headers {
    return this.cachePolicy.responseHeaders();
  }

  /**
   * Returns the time-to-live in seconds for the cached response.
   * @return The cache TTL in seconds.
   */
  public timeToLive(): number {
    return this.cachePolicy.timeToLive();
  }

  /**
   * Returns the headers needed for cache revalidation.
   * @param newAction The new dereference action requiring revalidation.
   * @return The revalidation request headers.
   */
  public async revalidationHeaders(newAction: IActionDereference): Promise<Headers> {
    return this.cachePolicy.revalidationHeaders({ ...newAction, mediaTypes: this.mediaTypes });
  }

  /**
   * Returns an updated cache policy after revalidation with the server.
   * @param revalidationAction The revalidation dereference action.
   * @param revalidationResponse The server's revalidation response headers.
   * @return The updated revalidation policy.
   */
  public async revalidatedPolicy(
    revalidationAction: IActionDereference,
    revalidationResponse: ICacheResponseHead,
  ): Promise<IRevalidationPolicy<IActionDereference>> {
    return await this.cachePolicy.revalidatedPolicy(
      { ...revalidationAction, mediaTypes: this.mediaTypes },
      revalidationResponse,
    );
  }
}
