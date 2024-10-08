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
import { ExpressionFunctionCoalesce } from './ExpressionFunctionCoalesce';

/**
 * A comunica ExpressionFunctionCoalesce Function Factory Actor.
 */
export class ActorFunctionFactoryExpressionCoalesce extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.COALESCE ],
      termFunction: false,
    });
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return <T extends { requireTermExpression: true } ?
      IActorFunctionFactoryOutputTerm :
      IActorFunctionFactoryOutput>
      <IExpressionFunction> new ExpressionFunctionCoalesce();
  }
}
