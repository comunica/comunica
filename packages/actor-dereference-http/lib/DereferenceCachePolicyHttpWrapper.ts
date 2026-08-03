import type { IActionDereference } from '@comunica/bus-dereference';
import type { IActionHttp } from '@comunica/bus-http';
import type { ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';
import { ActorDereferenceHttpBase } from './ActorDereferenceHttpBase';

/**
 * A wrapper around an HTTP request cache policy that exposes it as a dereference cache policy.
 */
export class DereferenceCachePolicyHttpWrapper implements ICachePolicy<IActionDereference> {
  public constructor(
    private readonly cachePolicy: ICachePolicy<IActionHttp>,
    private readonly maxAcceptHeaderLength: number,
  ) {}

  public storable(): boolean {
    return this.cachePolicy.storable();
  }

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

  public responseHeaders(): Headers {
    return this.cachePolicy.responseHeaders();
  }

  public timeToLive(): number {
    return this.cachePolicy.timeToLive();
  }

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
