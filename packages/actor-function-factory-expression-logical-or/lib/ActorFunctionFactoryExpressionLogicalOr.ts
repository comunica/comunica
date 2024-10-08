import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
  IExpressionFunction,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactoryDedicated,
} from '@comunica/bus-function-factory';
import { SparqlOperator } from '@comunica/utils-expression-evaluator';
import { ExpressionFunctionLogicalOr } from './ExpressionFunctionLogicalOr';

/**
 * A comunica ExpressionFunctionLogicalOr Function Factory Actor.
 */
export class ActorFunctionFactoryExpressionLogicalOr extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.LOGICAL_OR ],
      termFunction: false,
    });
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return <T extends { requireTermExpression: true } ?
      IActorFunctionFactoryOutputTerm :
      IActorFunctionFactoryOutput>
      <IExpressionFunction> new ExpressionFunctionLogicalOr();
  }
}
