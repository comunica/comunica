import type { IActionFunctionFactory, IActorFunctionFactoryOutput, IActorFunctionFactoryArgs } from '@comunica/bus-function-factory';
import { ActorFunctionFactory } from '@comunica/bus-function-factory';
import type { IActorTest } from '@comunica/core';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';
import { Not } from './NotFunction';

/**
 * A comunica Not Function Factory Actor.
 */
export class ActorFunctionFactoryNot extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    // Does support action.requireTermExpression, so no need to check for that.
    return action.functionName === C.RegularOperator.NOT;
  }

  public async run(action: IActionFunctionFactory): Promise<IActorFunctionFactoryOutput> {
    return new Not();
  }
}
