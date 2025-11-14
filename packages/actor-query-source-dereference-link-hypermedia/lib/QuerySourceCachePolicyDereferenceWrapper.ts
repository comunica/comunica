import type { IActionDereference } from '@comunica/bus-dereference';
import type { IActionQuerySourceDereferenceLink } from '@comunica/bus-query-source-dereference-link';
import type { ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';

export class QuerySourceCachePolicyDereferenceWrapper implements ICachePolicy<IActionQuerySourceDereferenceLink> {
  public constructor(
    private readonly cachePolicy: ICachePolicy<IActionDereference>,
  ) {}

  public storable(): boolean {
    return this.cachePolicy.storable();
  }

  public async satisfiesWithoutRevalidation(action: IActionQuerySourceDereferenceLink): Promise<boolean> {
    return this.cachePolicy.satisfiesWithoutRevalidation({ url: action.link.url, context: action.context });
  }

  public responseHeaders(): Headers {
    return this.cachePolicy.responseHeaders();
  }

  public timeToLive(): number {
    return this.cachePolicy.timeToLive();
  }

  public async revalidationHeaders(newAction: IActionQuerySourceDereferenceLink): Promise<Headers> {
    return this.cachePolicy.revalidationHeaders({ url: newAction.link.url, context: newAction.context });
  }

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
