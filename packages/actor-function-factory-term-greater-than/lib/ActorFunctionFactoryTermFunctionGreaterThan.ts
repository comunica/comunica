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

import { SparqlOperator } from '@comunica/utils-expression-evaluator';
import { TermFunctionGreaterThan } from './TermFunctionGreaterThan';

interface IActorFunctionFactoryTermFunctionGreaterThanArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica TermFunctionGreaterThan Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionGreaterThan extends ActorFunctionFactoryDedicated {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: IActorFunctionFactoryTermFunctionGreaterThanArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.GT ],
      termFunction: true,
    });
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
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
