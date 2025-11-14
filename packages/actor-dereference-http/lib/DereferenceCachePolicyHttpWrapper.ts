import type { IActionDereference } from '@comunica/bus-dereference';
import type { ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';
import { ActorDereferenceHttpBase } from './ActorDereferenceHttpBase';

/**
 * A wrapper around an HTTP request cache policy that exposes it as a dereference cache policy.
 */
export class DereferenceCachePolicyHttpWrapper implements ICachePolicy<IActionDereference> {
  public constructor(
    private readonly cachePolicy: ICachePolicy<Request>,
    private readonly maxAcceptHeaderLength: number,
  ) {}

  public storable(): boolean {
    return this.cachePolicy.storable();
  }

  public async satisfiesWithoutRevalidation(action: IActionDereference): Promise<boolean> {
    return this.cachePolicy.satisfiesWithoutRevalidation(new Request(action.url, {
      headers: await ActorDereferenceHttpBase.establishAcceptHeader(action, this.maxAcceptHeaderLength),
      method: action.method,
    }));
  }

  public responseHeaders(): Headers {
    return this.cachePolicy.responseHeaders();
  }

  public timeToLive(): number {
    return this.cachePolicy.timeToLive();
  }

  public async revalidationHeaders(newAction: IActionDereference): Promise<Headers> {
    return this.cachePolicy.revalidationHeaders(new Request(newAction.url, {
      headers: await ActorDereferenceHttpBase.establishAcceptHeader(newAction, this.maxAcceptHeaderLength),
      method: newAction.method,
    }));
  }

  public async revalidatedPolicy(
    revalidationAction: IActionDereference,
    revalidationResponse: ICacheResponseHead,
  ): Promise<IRevalidationPolicy<IActionDereference>> {
    const revalidatedPolicy = await this.cachePolicy.revalidatedPolicy(
      new Request(revalidationAction.url, {
        headers: await ActorDereferenceHttpBase.establishAcceptHeader(revalidationAction, this.maxAcceptHeaderLength),
        method: revalidationAction.method,
      }),
      revalidationResponse,
    );
    return {
      policy: new DereferenceCachePolicyHttpWrapper(revalidatedPolicy.policy, this.maxAcceptHeaderLength),
      modified: revalidatedPolicy.modified,
      matches: revalidatedPolicy.matches,
    };
  }
}
