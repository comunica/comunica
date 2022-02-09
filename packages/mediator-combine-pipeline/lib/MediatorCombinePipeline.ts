import type { Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs } from '@comunica/core';
import { Mediator } from '@comunica/core';
import type { IActionContext } from '@comunica/types';

/**
 * A comunica mediator that goes over all actors in sequence and forwards I/O.
 * This required the action input and the actor output to be of the same type.
 */
export class MediatorCombinePipeline
<A extends Actor<H, T, H>, H extends IAction | (IActorOutput & { context: IActionContext }), T extends IActorTest>
  extends Mediator<A, H, T, H> {
  public readonly filterErrors: boolean | undefined;

  public constructor(args: IMediatorCombinePipelineArgs<A, H, T, H>) {
    super(args);
  }

  public async mediate(action: H): Promise<H> {
    let testResults: IActorReply<A, H, T, H>[];
    try {
      testResults = this.publish(action);
    } catch {
      // If no actors are available, just return the input as output
      return action;
    }

    // Delegate test errors.
    if (this.filterErrors) {
      const _testResults: IActorReply<A, H, T, H>[] = [];
      for (const result of testResults) {
        try {
          await result.reply;
          _testResults.push(result);
          // eslint-disable-next-line no-empty
        } catch {
          // ignore errors
        }
      }
      testResults = _testResults;
    }

    await Promise.all(testResults.map(({ reply }) => reply));

    // Pass action to first actor,
    // and each actor output as input to the following actor.
    let handle: H = action;
    for (const { actor } of testResults) {
      handle = { ...handle, ...await actor.runObservable(handle) };
    }

    // Return the final actor output
    return handle;
  }

  protected mediateWith(): Promise<A> {
    throw new Error('Method not supported.');
  }
}

export interface IMediatorCombinePipelineArgs<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest,
  O extends IActorOutput> extends IMediatorArgs<A, I, T, O> {
  /**
   * If actors that throw test errors should be ignored
   */
  filterErrors?: boolean;
}
