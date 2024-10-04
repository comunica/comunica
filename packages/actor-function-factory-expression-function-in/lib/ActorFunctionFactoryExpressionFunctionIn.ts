import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
  IExpressionFunction,
  MediatorFunctionFactory,
  MediatorFunctionFactoryUnsafe,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactoryDedicated,
} from '@comunica/bus-function-factory';

import { SparqlOperator } from '@comunica/utils-expression-evaluator';
import { ExpressionFunctionIn } from './ExpressionFunctionIn';

interface IActorFunctionFactoryExpressionFunctionInArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica ExpressionFunctionIn Function Factory Actor.
 */
export class ActorFunctionFactoryExpressionFunctionIn extends ActorFunctionFactoryDedicated {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: IActorFunctionFactoryExpressionFunctionInArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.IN ],
      termFunction: false,
    });
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
  }

  public async run<T extends IActionFunctionFactory>(args: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    const equalityFunction = await this.mediatorFunctionFactory.mediate({
      functionName: SparqlOperator.EQUAL,
      requireTermExpression: true,
      context: args.context,
      arguments: args.arguments,
    });

    return <T extends { requireTermExpression: true } ?
      IActorFunctionFactoryOutputTerm :
      IActorFunctionFactoryOutput>
      <IExpressionFunction> new ExpressionFunctionIn(equalityFunction);
  }
}
