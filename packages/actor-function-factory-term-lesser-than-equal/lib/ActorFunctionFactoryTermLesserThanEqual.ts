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
import { TermFunctionLesserThanEqual } from './TermFunctionLesserThanEqual';

interface IActorFunctionFactoryTermFunctionLesserThanEqualArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica TermFunctionLesserThanEqual Function Factory Actor.
 */
export class ActorFunctionFactoryTermLesserThanEqual extends ActorFunctionFactoryDedicated {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: IActorFunctionFactoryTermFunctionLesserThanEqualArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.LTE ],
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
    return new TermFunctionLesserThanEqual(lessThanFunction);
  }
}
