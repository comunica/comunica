import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import {AsyncEvaluator} from "@comunica/expression-evaluator";

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
  public constructor(args: IActorExpressionEvaluatorAggregateArgs) {
    super(args);
  }
}

export interface IActionExpressionEvaluatorAggregate extends IAction {
  expr: Algebra.AggregateExpression;
  evaluator: AsyncEvaluator;
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
  result: () => RDF.Term;
}
