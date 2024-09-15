import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactoryDedicated,
} from '@comunica/bus-function-factory';
import { SparqlOperator } from '@comunica/expression-evaluator';
import { TermFunctionUnaryPlus } from './TermFunctionUnaryPlus';

/**
 * A comunica TermFunctionUnaryPlus Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionUnaryPlus extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args, [ SparqlOperator.UPLUS ], true);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionUnaryPlus();
  }
}
