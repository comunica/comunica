import type { Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs, TestResult } from '@comunica/core';
import { Mediator } from '@comunica/core';

/**
 * A comunica mediator that takes the union of all actor results.
 *
 * The actors that are registered first will have priority on setting overlapping fields.
 */
export class MediatorCombineUnion<
  A extends Actor<I, T, O, TS>,
I extends IAction,
T extends IActorTest,
O extends IActorOutput,
TS = undefined,
>
  extends Mediator<A, I, T, O, TS>
  implements IMediatorCombineUnionArgs<A, I, T, O, TS> {
  public readonly filterFailures: boolean | undefined;
  public readonly field: string;
  public readonly combiner: (results: O[]) => O;

  public constructor(args: IMediatorCombineUnionArgs<A, I, T, O, TS>) {
    super(args);
    this.combiner = this.createCombiner();
  }

  public override async mediate(action: I): Promise<O> {
    let testResults: IActorReply<A, I, T, O, TS>[];
    try {
      testResults = this.publish(action);
    } catch {
      testResults = [];
    }

    if (this.filterFailures) {
      const _testResults: IActorReply<A, I, T, O, TS>[] = [];
      for (const result of testResults) {
        const reply = await result.reply;
        if (reply.isPassed()) {
          _testResults.push(result);
        }
      }
      testResults = _testResults;
    }

    // Delegate reply errors.
    const sideDatas: (TS | undefined)[] = [];
    await Promise.all(testResults.map(async({ reply }, i) => {
      const awaited = (await reply);
      const value = awaited.getOrThrow();
      sideDatas[i] = awaited.getSideData();
      return value;
    }));

    // Run action on all actors.
    const results: O[] = await Promise.all(testResults
      .map((result, i) => result.actor.runObservable(action, sideDatas[i]!)));

    // Return the combined results.
    return this.combiner(results);
  }

  protected mediateWith(): Promise<TestResult<any, TS>> {
    throw new Error('Method not supported.');
  }

  protected createCombiner(): (results: O[]) => O {
    return (results: O[]) => {
      const data: any = {};
      data[this.field] = {};
      // eslint-disable-next-line unicorn/prefer-spread
      [{}].concat(results.map((result: any) => result[this.field]))
        // eslint-disable-next-line unicorn/no-array-for-each
        .forEach((value) => {
          data[this.field] = { ...value, ...data[this.field] };
        });
      return data;
    };
  }
}

export interface IMediatorCombineUnionArgs<
  A extends Actor<I, T, O, TS>,
I extends IAction,
T extends IActorTest,
O extends IActorOutput,
TS = undefined,
>
  extends IMediatorArgs<A, I, T, O, TS> {
  /**
   * If actors that throw test errors should be ignored
   */
  filterFailures?: boolean;
  /**
   * The field name of the test result field over which must be mediated.
   */
  field: string;
}
