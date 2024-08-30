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
import { TermFunctionGreaterThanEqual } from './TermFunctionGreaterThanEqual';

interface ActorFunctionFactoryTermFunctionGreaterThanEqualArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica TermFunctionGreaterThanEqual Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionGreaterThanEqual extends ActorFunctionFactory {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: ActorFunctionFactoryTermFunctionGreaterThanEqualArgs) {
    super(args);
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === SparqlOperator.GTE) {
      return true;
    }
    throw new Error(`Actor ${this.name} can only provide implementations for ${SparqlOperator.GTE}`);
  }

  public async run<T extends IActionFunctionFactory>(args: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    const lessThanEqualFunction = await this.mediatorFunctionFactory.mediate({
      functionName: SparqlOperator.LTE,
      requireTermExpression: true,
      context: args.context,
      arguments: args.arguments,
    });

    return new TermFunctionGreaterThanEqual(lessThanEqualFunction);
  }
}
