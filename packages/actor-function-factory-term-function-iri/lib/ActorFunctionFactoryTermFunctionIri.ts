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
import { TermFunctionIri } from './TermFunctionIri';

/**
 * A comunica TermFunctionIri Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionIri extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === SparqlOperator.IRI || action.functionName === SparqlOperator.URI) {
      return true;
    }
    throw new Error(
      `Actor ${this.name} can only provide implementations for ${SparqlOperator.IRI} and ${SparqlOperator.URI}`,
    );
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionIri();
  }
}
