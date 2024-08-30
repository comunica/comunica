import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
  MediatorFunctionFactory,
  MediatorFunctionFactoryUnsafe,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactory,
} from '@comunica/bus-function-factory';
import type { IActorTest } from '@comunica/core';
import { SparqlOperator } from '@comunica/expression-evaluator';
import { TermFunctionLesserThanEqual } from './TermFunctionLesserThanEqual';

interface ActorFunctionFactoryTermFunctionLesserThanEqualArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica TermFunctionLesserThanEqual Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionLesserThanEqual extends ActorFunctionFactory {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: ActorFunctionFactoryTermFunctionLesserThanEqualArgs) {
    super(args);
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === SparqlOperator.LTE) {
      return true;
    }
    throw new Error(`Actor ${this.name} can only provide implementations for ${SparqlOperator.LTE}`);
  }

  public async run<T extends IActionFunctionFactory>(args: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    const equalityFunction = await this.mediatorFunctionFactory.mediate({
      functionName: SparqlOperator.EQUAL,
      requireTermExpression: true,
      context: args.context,
      arguments: args.arguments,
    });
    const lessThanFunction = await this.mediatorFunctionFactory.mediate({
      functionName: SparqlOperator.LT,
      requireTermExpression: true,
      context: args.context,
      arguments: args.arguments,
    });
    return new TermFunctionLesserThanEqual(equalityFunction, lessThanFunction);
  }
}
