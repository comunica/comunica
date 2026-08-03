import type { ICachePolicy, ICacheResponseHead, IRevalidationPolicy } from '@comunica/types';
import type { IActionDereference } from './ActorDereference';

export class DereferenceRdfCachePolicyDereferenceWrapper implements ICachePolicy<IActionDereference> {
  public constructor(
    private readonly cachePolicy: ICachePolicy<IActionDereference>,
    private readonly mediaTypes: () => Promise<Record<string, number> | undefined>,
  ) {}

  public storable(): boolean {
    return this.cachePolicy.storable();
  }

  public async satisfiesWithoutRevalidation(action: IActionDereference): Promise<boolean> {
    return this.cachePolicy.satisfiesWithoutRevalidation({ ...action, mediaTypes: this.mediaTypes });
  }

  public responseHeaders(): Headers {
    return this.cachePolicy.responseHeaders();
  }

  public timeToLive(): number {
    return this.cachePolicy.timeToLive();
  }

  public async revalidationHeaders(newAction: IActionDereference): Promise<Headers> {
    return this.cachePolicy.revalidationHeaders({ ...newAction, mediaTypes: this.mediaTypes });
  }

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
