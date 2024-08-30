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
import { TermFunctionGreaterThan } from './TermFunctionGreaterThan';

interface ActorFunctionFactoryTermFunctionGreaterThanArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica TermFunctionGreaterThan Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionGreaterThan extends ActorFunctionFactory {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: ActorFunctionFactoryTermFunctionGreaterThanArgs) {
    super(args);
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === SparqlOperator.GT) {
      return true;
    }
    throw new Error(`Actor ${this.name} can only provide implementations for ${SparqlOperator.GT}`);
  }

  public async run<T extends IActionFunctionFactory>(args: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    const lessThanFunction = await this.mediatorFunctionFactory.mediate({
      functionName: SparqlOperator.LT,
      requireTermExpression: true,
      context: args.context,
      arguments: args.arguments,
    });

    return new TermFunctionGreaterThan(lessThanFunction);
  }
}
