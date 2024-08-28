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
import { TermFunctionXsdToDatetime } from './TermFunctionXsdToDatetime';

/**
 * A comunica TermFunctionXsdToDatetime Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionXsdToDatetime extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === SparqlOperator.XSD_DATE_TIME) {
      return true;
    }
    throw new Error(`Actor ${this.name} can only provide implementations for ${SparqlOperator.XSD_DATE_TIME}`);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToDatetime();
  }
}
