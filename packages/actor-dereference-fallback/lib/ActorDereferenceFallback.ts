import type { IActionDereference, IActorDereferenceOutput, IActorDereferenceArgs } from '@comunica/bus-dereference';
import { ActorDereference } from '@comunica/bus-dereference';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica Fallback Dereference Actor.
 */
export class ActorDereferenceFallback extends ActorDereference {
  public constructor(args: IActorDereferenceArgs) {
    super(args);
  }

  public async test(action: IActionDereference): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionDereference): Promise<IActorDereferenceOutput> {
    return this.handleDereferenceErrors(action, new Error(`Could not dereference '${action.url}'`));
  }
}
