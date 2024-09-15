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
import { TermFunctionInequality } from './TermFunctionInequality';

interface ActorFunctionFactoryTermFunctionInequalityArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica TermFunctionInequality Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionInequality extends ActorFunctionFactoryDedicated {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: ActorFunctionFactoryTermFunctionInequalityArgs) {
    super(args, [ SparqlOperator.NOT_EQUAL ], true);
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

    return new TermFunctionInequality(equalityFunction);
  }
}
