import type { Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs } from '@comunica/core';
import { Mediator } from '@comunica/core';

/**
 * A comunica mediator that takes the union of all actor results.
 *
 * The actors that are registered first will have priority on setting overlapping fields.
 */
export class MediatorCombineUnion<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest,
  O extends IActorOutput> extends Mediator<A, I, T, O> implements IMediatorCombineUnionArgs<A, I, T, O> {
  public readonly field: string;
  public readonly combiner: (results: O[]) => O;

  public constructor(args: IMediatorCombineUnionArgs<A, I, T, O>) {
    super(args);
    this.combiner = this.createCombiner();
  }

  public async mediate(action: I): Promise<O> {
    let testResults: IActorReply<A, I, T, O>[];
    try {
      testResults = this.publish(action);
    } catch {
      testResults = [];
    }

    // Delegate test errors.
    await Promise.all(testResults.map(({ reply }) => reply));

    // Run action on all actors.
    const results: O[] = await Promise.all(testResults.map(result => result.actor.runObservable(action)));

    // Return the combined results.
    return this.combiner(results);
  }

  protected mediateWith(): Promise<A> {
    throw new Error('Method not supported.');
  }

  protected createCombiner(): (results: O[]) => O {
    return (results: O[]) => {
      const data: any = {};
      data[this.field] = {};
      // eslint-disable-next-line unicorn/prefer-spread
      [{}].concat(results.map((result: any) => result[this.field]))
        .forEach((value, index, arr) => {
          data[this.field] = { ...value, ...data[this.field] };
        });
      return data;
    };
  }
}

export interface IMediatorCombineUnionArgs<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest,
  O extends IActorOutput> extends IMediatorArgs<A, I, T, O> {
  /**
   * The field name of the test result field over which must be mediated.
   */
  field: string;
}
