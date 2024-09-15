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

import { SparqlOperator } from '@comunica/expression-evaluator';
import { ExpressionFunctionConcat } from './ExpressionFunctionConcat';

/**
 * A comunica ExpressionFunctionConcat Function Factory Actor.
 */
export class ActorFunctionFactoryExpressionFunctionConcat extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args, [ SparqlOperator.CONCAT ], false);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return <T extends { requireTermExpression: true } ?
      IActorFunctionFactoryOutputTerm :
      IActorFunctionFactoryOutput>
      <IExpressionFunction> new ExpressionFunctionConcat();
  }
}
