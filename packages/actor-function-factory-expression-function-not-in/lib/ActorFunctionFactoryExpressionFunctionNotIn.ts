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
  ActorFunctionFactory,
} from '@comunica/bus-function-factory';
import type { IActorTest } from '@comunica/core';
import { SparqlOperator } from '@comunica/expression-evaluator';
import { ExpressionFunctionNotIn } from './ExpressionFunctionNotIn';

interface ActorFunctionFactoryExpressionFunctionNotInArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica ExpressionFunctionNotIn Function Factory Actor.
 */
export class ActorFunctionFactoryExpressionFunctionNotIn extends ActorFunctionFactory {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: ActorFunctionFactoryExpressionFunctionNotInArgs) {
    super(args);
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === SparqlOperator.NOT_IN && !action.requireTermExpression) {
      return true;
    }
    throw new Error(`Actor ${this.name} can only provide non-termExpression implementations for ${SparqlOperator.NOT_IN}`);
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
