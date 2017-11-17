import {Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs, Mediator} from "@comunica/core";
import * as _ from "lodash";

/**
 * A comunica mediator that takes the union of all actor results.
 *
 * The actors that are registered first will have priority on setting overlapping fields.
 */
export class MediatorCombineUnion<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest,
  O extends IActorOutput> extends Mediator<A, I, T, O> implements IMediatorCombineUnionArgs<A, I, T, O> {

  public readonly field: string;
  public readonly combiner: (results: O[]) => O;

  constructor(args: IMediatorCombineUnionArgs<A, I, T, O>) {
    super(args);
    this.combiner = this.createCombiner();
  }

  public async mediate(action: I): Promise<O> {
    const testResults: IActorReply<A, I, T, O>[] = this.publish(action);

    // Delegate test errors.
    await Promise.all(_.map(testResults, 'reply'));

    // Run action on all actors.
    const results: O[] = await Promise.all(testResults.map((result) => result.actor.run(action)));

    // Return the combined results.
    return this.combiner(results);
  }

  protected mediateWith(action: I, testResults: IActorReply<A, I, T, O>[]): Promise<A> {
    throw new Error("Method not supported.");
  }

  protected createCombiner(): (results: O[]) => O {
    return (results: O[]) => {
      const data: any = {};
      data[this.field] = _.defaults.apply(_, _.map(results, this.field));
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
