import type {
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

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
export abstract class ActorBindingsAggregatorFactory<TS = undefined> extends Actor<
IActionBindingsAggregatorFactory,
IActorTest,
IActorBindingsAggregatorFactoryOutput,
TS
> {
  /**
   * The mediator for creating expression evaluators.
   */
  protected readonly mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  /* eslint-disable max-len */
  /**
   * @param args -
   *  \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *  \ @defaultNested {Creation of Aggregator failed: none of the configured actors were able to handle ${action.expr.aggregator}} busFailMessage
   */
  /* eslint-enable max-len */
  protected constructor(args: IActorBindingsAggregatorFactoryArgs<TS>) {
    super(args);
    this.mediatorExpressionEvaluatorFactory = args.mediatorExpressionEvaluatorFactory;
  }
}

export interface IActionBindingsAggregatorFactory extends IAction {
  /**
   * The aggregate expression to create an aggregator for.
   */
  expr: Algebra.AggregateExpression;
}

/**
 * Instances of this interface perform a specific aggregation of bindings.
 * You can put bindings and when all bindings have been put, request the result.
 */
export interface IBindingsAggregator {
  /**
   * Registers bindings to the aggregator. Each binding you put has the ability to change the aggregation result.
   * @param bindings the bindings to put.
   */
  putBindings: (bindings: RDF.Bindings) => Promise<void>;

  /**
   * Request the result term of aggregating the bindings you have put in the aggregator.
   */
  result: () => Promise<RDF.Term | undefined>;
}

/**
 * Output of a bindings aggregator factory actor.
 */
export interface IActorBindingsAggregatorFactoryOutput extends IActorOutput, IBindingsAggregator {}

/**
 * Constructor arguments for {@link ActorBindingsAggregatorFactory}.
 * @template TS The test side-data type.
 */
export interface IActorBindingsAggregatorFactoryArgs<TS = undefined> extends IActorArgs<
IActionBindingsAggregatorFactory,
IActorTest,
IActorBindingsAggregatorFactoryOutput,
TS
> {
  /**
   * The mediator for creating expression evaluators.
   */
  mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
}

/**
 * Mediator type for bindings aggregator factory actors.
 */
export type MediatorBindingsAggregatorFactory = Mediate<
IActionBindingsAggregatorFactory,
IActorBindingsAggregatorFactoryOutput
>;
