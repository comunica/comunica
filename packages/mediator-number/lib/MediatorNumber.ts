import type { Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs } from '@comunica/core';
import { Mediator } from '@comunica/core';

/**
 * A mediator that can mediate over a single number field.
 *
 * It takes the required 'field' and 'type' parameters.
 * The 'field' parameter represents the field name of the test result field over which must be mediated.
 * The 'type' parameter
 */
export class MediatorNumber<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>
  extends Mediator<A, I, T, O> implements IMediatorNumberArgs<A, I, T, O> {
  public readonly field: string;
  public readonly type: 'min' | 'max';
  public readonly ignoreErrors: boolean;
  public readonly indexPicker: (tests: T[]) => number;

  public constructor(args: IMediatorNumberArgs<A, I, T, O>) {
    super(args);
    this.indexPicker = this.createIndexPicker();
  }

  /**
   * @return {(tests: T[]) => number} A function that returns the index of the test result
   *                                  that has been chosen by this mediator.
   */
  protected createIndexPicker(): (tests: (T | undefined)[]) => number {
    switch (this.type) {
      case 'min':
        return (tests: (T | undefined)[]): number => tests.reduce((prev, curr, i) => {
          const val: number = this.getOrDefault((<any> curr)[this.field], Number.POSITIVE_INFINITY);
          return val !== null && (Number.isNaN(prev[0]) || prev[0] > val) ? [ val, i ] : prev;
        }, [ Number.NaN, -1 ])[1];
      case 'max':
        return (tests: (T | undefined)[]): number => tests.reduce((prev, curr, i) => {
          const val: number = this.getOrDefault((<any> curr)[this.field], Number.NEGATIVE_INFINITY);
          return val !== null && (Number.isNaN(prev[0]) || prev[0] < val) ? [ val, i ] : prev;
        }, [ Number.NaN, -1 ])[1];
      default:
        // eslint-disable-next-line ts/restrict-template-expressions
        throw new Error(`No valid "type" value was given, must be either 'min' or 'max', but got: ${this.type}`);
    }
  }

  protected getOrDefault(value: number | undefined, defaultValue: number): number {
    // eslint-disable-next-line ts/prefer-nullish-coalescing
    return value === undefined ? defaultValue : value;
  }

  protected async mediateWith(action: I, testResults: IActorReply<A, I, T, O>[]): Promise<A> {
    let promises = testResults.map(({ reply }) => reply);
    const errors: Error[] = [];
    if (this.ignoreErrors) {
      const dummy: any = {};
      dummy[this.field] = null;
      // eslint-disable-next-line ts/no-floating-promises
      promises = promises.map(promise => promise.catch((error) => {
        errors.push(error);
        return dummy;
      }));
    }
    const results = await Promise.all(promises);
    const index = this.indexPicker(results);
    if (index < 0) {
      throw new Error(`All actors rejected their test in ${this.name}\n${
        errors.map(error => error.message).join('\n')}`);
    }
    return testResults[index].actor;
  }
}

export interface IMediatorNumberArgs<
  A extends Actor<I, T, O>,
I extends IAction,
T extends IActorTest,
O extends IActorOutput,
>
  extends IMediatorArgs<A, I, T, O> {
  /**
   * The field name of the test result field over which must be mediated.
   */
  field: string;
  /**
   * The way how the index should be selected.
   * For choosing the minimum value: 'min'.
   * For choosing the maximum value: 'max'.
   */
  type: 'min' | 'max';

  /**
   * If actors that throw test errors should be ignored
   */
  ignoreErrors?: boolean;
}
