import {IActorReply} from "@comunica/core";
import {Actor, IAction, IActorOutput, IActorTest} from "@comunica/core/lib/Actor";
import {IMediatorArgs, Mediator} from "@comunica/core/lib/Mediator";
import * as _ from "lodash";

/**
 * A mediator that can mediate over a single number field.
 *
 * It takes the required 'field' and 'type' parameters.
 * The 'field' parameter represents the field name of the test result field over which must be mediated.
 * The 'type' parameter
 */
export class MediatorNumber<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>
  extends Mediator<A, I, T, O> implements IMediatorNumberArgs<A, I, T, O> {

  public static MIN: string = "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/mediator-number/" +
    "Mediator/Number/type/TypeMin";
  public static MAX: string = "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/mediator-number/" +
    "Mediator/Number/type/TypeMax";

  public readonly field: string;
  public readonly type: string;
  public readonly indexPicker: (tests: T[]) => number;

  constructor(args: IMediatorNumberArgs<A, I, T, O>) {
    super(args);
    if (!this.field) {
      throw new Error('A valid "field" argument must be provided.');
    }
    if (!this.type) {
      throw new Error('A valid "type" argument must be provided.');
    }
    this.indexPicker = this.createIndexPicker();
  }

  /**
   * @return {(tests: T[]) => number} A function that returns the index of the test result
   *                                  that has been chosen by this mediator.
   */
  protected createIndexPicker(): (tests: T[]) => number {
    switch (this.type) {
    case MediatorNumber.MIN:
      return (tests: T[]) => <number> tests.reduce((a, b, i) => a[0] >= (<any> b)[this.field]
        ? [(<any> b)[this.field], i] : a, [ Infinity, -1 ])[1];
    case MediatorNumber.MAX:
      return (tests: T[]) => <number> tests.reduce((a, b, i) => a[0] <= (<any> b)[this.field]
        ? [(<any> b)[this.field], i] : a, [ -Infinity, -1 ])[1];
    }
    throw new Error('No valid "type" value was given, must be either '
      + MediatorNumber.MIN + ' or ' + MediatorNumber.MAX);
  }

  protected async mediateWith(action: I, testResults: IActorReply<A, I, T, O>[]): Promise<A> {
    const results: T[] = await Promise.all(_.map(testResults, 'reply'));
    return testResults[this.indexPicker(results)].actor;
  }

}

export interface IMediatorNumberArgs<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest,
  O extends IActorOutput> extends IMediatorArgs<A, I, T, O> {
  /**
   * The field name of the test result field over which must be mediated.
   */
  field: string;
  /**
   * The way how the index should be selected.
   * For choosing the minimum value: {@link MediatorNumber#MIN}
   * For choosing the maximum value: {@link MediatorNumber#MAX}
   */
  type: string;
}
