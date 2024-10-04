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
import { ExpressionFunctionNotIn } from './ExpressionFunctionNotIn';

interface IActorFunctionFactoryExpressionFunctionNotInArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica ExpressionFunctionNotIn Function Factory Actor.
 */
export class ActorFunctionFactoryExpressionFunctionNotIn extends ActorFunctionFactoryDedicated {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: IActorFunctionFactoryExpressionFunctionNotInArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.NOT_IN ],
      termFunction: false,
    });
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
  }

  public async run<T extends IActionFunctionFactory>(args: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    const inFunction = await this.mediatorFunctionFactory.mediate({
      functionName: SparqlOperator.IN,
      context: args.context,
      arguments: args.arguments,
    });

    return <T extends { requireTermExpression: true } ?
      IActorFunctionFactoryOutputTerm :
      IActorFunctionFactoryOutput>
      <IExpressionFunction> new ExpressionFunctionNotIn(inFunction);
  }
}
