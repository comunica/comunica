import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactory,
} from '@comunica/bus-function-factory';
import type { IActorTest } from '@comunica/core';
import { SparqlOperator } from '@comunica/expression-evaluator';
import { TermFunctionLesserThanEqual } from './TermFunctionLesserThanEqual';

/**
 * A comunica TermFunctionLesserThanEqual Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionLesserThanEqual extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === SparqlOperator.LTE) {
      return true;
    }
    throw new Error(`Actor ${this.name} can only provide implementations for ${SparqlOperator.LTE}`);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionLesserThanEqual();
  }
}
