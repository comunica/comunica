import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactory,
} from '@comunica/bus-function-factory';
import type { IActorTest } from '@comunica/core';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';
import { Abs } from './AbsFunction';

/**
 * A comunica Abs Function Factory Actor.
 */
export class ActorFunctionFactoryAbs extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    // Does support action.requireTermExpression, so no need to check for that.
    if (action.functionName === C.RegularOperator.ABS) {
      return true;
    }
    throw new Error(`Actor ${this.name} can only test for ${C.RegularOperator.ABS}`);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new Abs();
  }
}