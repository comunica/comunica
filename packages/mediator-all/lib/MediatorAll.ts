import type { Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs, TestResult } from '@comunica/core';
import { Mediator } from '@comunica/core';

/**
 * A comunica mediator that runs all actors that resolve their test.
 * This mediator will always resolve to the first actor's output.
 */
export class MediatorAll<
  A extends Actor<I, T, O, TS>,
I extends IAction,
T extends IActorTest,
O extends IActorOutput,
TS = undefined,
>
  extends Mediator<A, I, T, O, TS> {
  public constructor(args: IMediatorArgs<A, I, T, O, TS>) {
    super(args);
  }

  public override async mediate(action: I): Promise<O> {
    // Collect all actors that resolve their test
    const passedResults: { actor: A; sideData: TS }[] = [];
    let testResults: IActorReply<A, I, T, O, TS>[];
    try {
      testResults = this.publish(action);
    } catch {
      testResults = [];
    }
    for (const testResult of testResults) {
      const reply = await testResult.reply;
      if (reply.isPassed()) {
        passedResults.push({ actor: testResult.actor, sideData: reply.getSideData() });
      }
    }

    // Send action to all valid actors
    const outputs = await Promise.all(passedResults.map(result => result.actor.runObservable(action, result.sideData)));

    return outputs[0];
  }

  protected async mediateWith(): Promise<TestResult<A, TS>> {
    throw new Error('Unsupported operation: MediatorAll#mediateWith');
  }
}
