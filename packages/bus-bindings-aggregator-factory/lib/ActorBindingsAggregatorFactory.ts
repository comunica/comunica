import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IBindingAggregator, IExpressionEvaluatorFactory } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica actor for creating Binding-Aggregators.
 *
 * Actor types:
 * * Input:  IActionExpressionEvaluatorAggregate:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorExpressionEvaluatorAggregateOutput: TODO: fill in.
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
  factory: IExpressionEvaluatorFactory;
}

export interface IActorBindingsAggregatorFactoryOutput extends IActorOutput {
  aggregator: IBindingAggregator;
}

export type IActorBindingsAggregatorFactoryArgs = IActorArgs<
IActionBindingsAggregatorFactory, IActorTest, IActorBindingsAggregatorFactoryOutput>;

export type MediatorBindingsAggregatorFactory = Mediate<
IActionBindingsAggregatorFactory, IActorBindingsAggregatorFactoryOutput>;
