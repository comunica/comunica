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
import { SparqlOperator } from '@comunica/expression-evaluator';
import { ExpressionFunctionIf } from './ExpressionFunctionIf';

/**
 * A comunica ExpressionFunctionIf Function Factory Actor.
 */
export class ActorFunctionFactoryExpressionFunctionIf extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === SparqlOperator.IF && !action.requireTermExpression) {
      return true;
    }
    throw new Error(`Actor ${this.name} can only provide non-termExpression implementations for ${SparqlOperator.IF}`);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new ExpressionFunctionIf();
  }
}
