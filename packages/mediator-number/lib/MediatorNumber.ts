import {Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs, Mediator} from "@comunica/core";

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
  public readonly ignoreErrors: boolean;
  public readonly indexPicker: (tests: T[]) => number;

  constructor(args: IMediatorNumberArgs<A, I, T, O>) {
    super(args);
    this.indexPicker = this.createIndexPicker();
  }

  /**
   * @return {(tests: T[]) => number} A function that returns the index of the test result
   *                                  that has been chosen by this mediator.
   */
  protected createIndexPicker(): (tests: T[]) => number {
    switch (this.type) {
    case MediatorNumber.MIN:
      return (tests: T[]) => <number> tests.reduce((a, b, i) => {
        const val: number = this.getOrDefault((<any> b)[this.field], Infinity);
        return val !== null && (isNaN(a[0]) || a[0] > val) ? [val, i] : a;
      }, [ NaN, -1 ])[1];
    case MediatorNumber.MAX:
      return (tests: T[]) => <number> tests.reduce((a, b, i) => {
        const val: number = this.getOrDefault((<any> b)[this.field], -Infinity);
        return val !== null && (isNaN(a[0]) || a[0] < val) ? [val, i] : a;
      }, [ NaN, -1 ])[1];
    }
    throw new Error('No valid "type" value was given, must be either '
      + MediatorNumber.MIN + ' or ' + MediatorNumber.MAX + ', but got: ' + this.type);
  }

  protected getOrDefault(value: number | null, defaultValue: number): number {
    return value === undefined ? defaultValue : value;
  }

  protected async mediateWith(action: I, testResults: IActorReply<A, I, T, O>[]): Promise<A> {
    let promises = testResults.map(({ reply }) => reply);
    const errors: Error[] = [];
    if (this.ignoreErrors) {
      const dummy: any = {};
      dummy[this.field] = null;
      promises = promises.map((p) => p.catch((error) => {
        errors.push(error);
        return dummy;
      }));
    }
    const results = await Promise.all(promises);
    const index = this.indexPicker(results);
    if (index < 0) {
      throw new Error('All actors rejected their test in ' + this.name + '\n'
        + errors.map((e) => e.toString()).join('\n'));
    }
    return testResults[index].actor;
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

  /**
   * If actors that throw test errors should be ignored
   */
  ignoreErrors?: boolean;
}
