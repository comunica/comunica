import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { ExpressionEvaluatorFactory } from '@comunica/expression-evaluator';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica actor for expression-evaluator-aggregate events.
 *
 * Actor types:
 * * Input:  IActionExpressionEvaluatorAggregate:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorExpressionEvaluatorAggregateOutput: TODO: fill in.
 *
 * @see IActionExpressionEvaluatorAggregate
 * @see IActorExpressionEvaluatorAggregateOutput
 */
export abstract class ActorExpressionEvaluatorAggregate extends Actor<
IActionExpressionEvaluatorAggregate, IActorTest, IActorExpressionEvaluatorAggregateOutput> {
  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  protected constructor(args: IActorExpressionEvaluatorAggregateArgs) {
    super(args);
  }
}

export interface IActionExpressionEvaluatorAggregate extends IAction {
  expr: Algebra.AggregateExpression;
  factory: ExpressionEvaluatorFactory;
}

export interface IActorExpressionEvaluatorAggregateOutput extends IActorOutput {
  aggregator: IAggregator;
}

export type IActorExpressionEvaluatorAggregateArgs = IActorArgs<
IActionExpressionEvaluatorAggregate, IActorTest, IActorExpressionEvaluatorAggregateOutput>;

export type MediatorExpressionEvaluatorAggregate = Mediate<
IActionExpressionEvaluatorAggregate, IActorExpressionEvaluatorAggregateOutput>;

export interface IAggregator {
  putBindings: (bindings: RDF.Bindings) => Promise<void>;
  result: () => RDF.Term | undefined;
  emptyValue: () => RDF.Term | undefined;
}
