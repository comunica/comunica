import {Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs, Mediator} from "@comunica/core";

/**
 * A comunica mediator that goes over all actors in sequence and forwards I/O.
 * This required the action input and the actor output to be of the same type.
 */
export class MediatorCombinePipeline<A extends Actor<H, T, H>, H extends IAction | IActorOutput, T extends IActorTest>
  extends Mediator<A, H, T, H> {

  constructor(args: IMediatorArgs<A, H, T, H>) {
    super(args);
  }

  public async mediate(action: H): Promise<H> {
    let testResults: IActorReply<A, H, T, H>[];
    try {
      testResults = this.publish(action);
    } catch (e) {
      // If no actors are available, just return the input as output
      return action;
    }

    // Delegate test errors.
    await Promise.all(testResults.map(({ reply }) => reply));

    // Pass action to first actor,
    // and each actor output as input to the following actor.
    let handle: H = action;
    for (const actor of testResults.map((result) => result.actor)) {
      handle = await actor.runObservable(handle);
    }

    // Return the final actor output
    return handle;
  }

  protected mediateWith(action: H, testResults: IActorReply<A, H, T, H>[]): Promise<A> {
    throw new Error("Method not supported.");
  }

}
