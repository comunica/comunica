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
  public readonly order: 'increasing' | 'decreasing' | undefined;
  public readonly field: string | undefined;

  public constructor(args: IMediatorCombinePipelineArgs<A, H, T, H>) {
    super(args);
  }

  public async mediate(action: H): Promise<H> {
    let testResults: IActorReply<A, H, T, H>[] | { actor: A; reply: T }[];
    try {
      testResults = this.publish(action);
    } catch {
      // If no actors are available, just return the input as output
      return action;
    }

    if (this.filterErrors) {
      const _testResults: IActorReply<A, H, T, H>[] = [];
      for (const result of testResults) {
        try {
          await result.reply;
          _testResults.push(result);
        } catch {
          // Ignore errors
        }
      }
      testResults = _testResults;
    }

    // Delegate test errors.
    testResults = await Promise.all(testResults.map(async({ actor, reply }) => ({ actor, reply: await reply })));

    // Order the test results if ordering is enabled
    if (this.order) {
      // A function used to extract an ordering value from a test result
      const getOrder = (elem: T): number => {
        // If there is a field key use it, otherwise use the input
        // element for ordering
        const value = this.field ? (<any> elem)[this.field] : elem;

        // Check the ordering value is a number
        if (typeof value !== 'number') {
          throw new Error('Cannot order elements that are not numbers.');
        }
        return value;
      };

      testResults = testResults.sort((actor1, actor2) =>
        (this.order === 'increasing' ? 1 : -1) *
        (getOrder(actor1.reply) - getOrder(actor2.reply)));
    }

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
  /**
   * The field to use for ordering (if the ordering strategy is chosen).
   * Leave undefined if the test output is a number rather than an object.
   */
  field?: string;
  /**
   * The strategy of ordering the pipeline (increasing or decreasing).
   * For choosing to leave the order of the pipeline unchanged, leave this undefined.
   * For choosing to order by increasing values: 'increasing'.
   * For choosing to order by decreasing values: 'decreasing'.
   */
  order?: 'increasing' | 'decreasing' | undefined;
}
