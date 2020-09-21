import type { Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs } from '@comunica/core';
import { Mediator } from '@comunica/core';

/**
 * A comunica mediator that runs all actors that resolve their test.
 * This mediator will always resolve to the first actor's output.
 */
export class MediatorAll<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>
  extends Mediator<A, I, T, O> {
  public constructor(args: IMediatorArgs<A, I, T, O>) {
    super(args);
  }

  public async mediate(action: I): Promise<O> {
    // Collect all actors that resolve their test
    const validActors: A[] = [];
    let testResults: IActorReply<A, I, T, O>[];
    try {
      testResults = this.publish(action);
    } catch {
      testResults = [];
    }
    for (const testResult of testResults) {
      try {
        await testResult.reply;
        validActors.push(testResult.actor);
      } catch {
        // Ignore errors
      }
    }

    // Send action to all valid actors
    const outputs = await Promise.all(validActors.map(actor => actor.runObservable(action)));

    return outputs[0];
  }

  protected async mediateWith(): Promise<A> {
    throw new Error('Unsupported operation: MediatorAll#mediateWith');
  }
}
