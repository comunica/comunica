import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IBindingsAggregator } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica actor for creating Binding-Aggregator-factories.
 *
 * Actor types:
 * * Input:  IActionBindingsAggregatorFactory:      A SPARQL expression and a factory for an expression evaluator.
 * * Test:   <none>
 * * Output: IActorBindingsAggregatorFactoryOutput: An aggregator of RDF bindings.
 *
 * @see IActionBindingsAggregatorFactory
 * @see IActorBindingsAggregatorFactoryOutput
 */
export abstract class ActorBindingsAggregatorFactory extends Actor<
IActionBindingsAggregatorFactory, IActorTest, IActorBindingsAggregatorFactoryOutput> {
  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  protected constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }
}

export interface IActionBindingsAggregatorFactory extends IAction {
  expr: Algebra.AggregateExpression;
  factory: ActorExpressionEvaluatorFactory;
}

export interface IActorBindingsAggregatorFactoryOutput extends IActorOutput {
  aggregator: IBindingsAggregator;
}

export type IActorBindingsAggregatorFactoryArgs = IActorArgs<
IActionBindingsAggregatorFactory, IActorTest, IActorBindingsAggregatorFactoryOutput>;

export type MediatorBindingsAggregatorFactory = Mediate<
IActionBindingsAggregatorFactory, IActorBindingsAggregatorFactoryOutput>;
