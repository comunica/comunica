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
import { TermFunctionIsIri } from './TermFunctionIsIri';

/**
 * A comunica TermFunctionIsIri Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionIsIri extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === SparqlOperator.IS_IRI || action.functionName === SparqlOperator.IS_URI) {
      return true;
    }
    throw new Error(`Actor ${this.name} can only provide implementations for ${SparqlOperator.IS_IRI} and ${SparqlOperator.IS_URI}`);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionIsIri();
  }
}
