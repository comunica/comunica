import {Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs, Mediator} from "@comunica/core";

/**
 * A comunica mediator that runs all actors that resolve their test.
 * This mediator will always resolve to `null`.
 */
export class MediatorAll<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>
  extends Mediator<A, I, T, O> {

  constructor(args: IMediatorArgs<A, I, T, O>) {
    super(args);
  }

  public async mediate(action: I): Promise<O> {
    // Collect all actors that resolve their test
    const validActors: A[] = [];
    let testResults: IActorReply<A, I, T, O>[];
    try {
      testResults = this.publish(action);
    } catch (e) {
      testResults = [];
    }
    for (const testResult of testResults) {
      try {
        await testResult.reply;
        validActors.push(testResult.actor);
      } catch (e) {
        // Ignore errors
      }
    }

    // Send action to all valid actors
    await Promise.all(validActors.map((actor) => actor.runObservable(action)));

    return null;
  }

  protected async mediateWith(action: I, testResults: IActorReply<A, I, T, O>[]): Promise<A> {
    return null;
  }

}
