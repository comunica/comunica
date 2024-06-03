import { ActorPathQuerying, IActionPathQuerying, IActorPathQueryingOutput, 
  IActorPathQueryingArgs } from '@comunica/bus-path-querying';
import { IActorArgs, IActorTest } from '@comunica/core';

/**
 * A comunica One Hop Path Querying Actor.
 */
export class ActorPathQueryingOneHop extends ActorPathQuerying {
  public constructor(args: IActorPathQueryingArgs) {
    super(args);
  }

  public async test(action: IActionPathQuerying): Promise<IActorTest> {
    return true; // TODO implement
  }

  public async run(action: IActionPathQuerying): Promise<IActorPathQueryingOutput> {
    return true; // TODO implement
  }
}
