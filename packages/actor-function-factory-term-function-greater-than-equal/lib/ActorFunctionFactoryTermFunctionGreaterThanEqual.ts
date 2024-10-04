import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
  MediatorFunctionFactory,
  MediatorFunctionFactoryUnsafe,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactoryDedicated,
} from '@comunica/bus-function-factory';

import { SparqlOperator } from '@comunica/expression-evaluator';
import { TermFunctionGreaterThanEqual } from './TermFunctionGreaterThanEqual';

interface IActorFunctionFactoryTermFunctionGreaterThanEqualArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica TermFunctionGreaterThanEqual Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionGreaterThanEqual extends ActorFunctionFactoryDedicated {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: IActorFunctionFactoryTermFunctionGreaterThanEqualArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.GTE ],
      termFunction: true,
    });
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
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
