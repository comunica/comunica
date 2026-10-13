import type {
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IBindingsAggregator as IBindingsAggregatorType } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';

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
  expr: Algebra.AggregateExpression;
}

/**
 * An aggregator of RDF bindings.
 * Defined in `@comunica/types`, and exposed here for backwards compatibility.
 * @deprecated use export from `@comunica/types` instead.
 */
// TODO (next major): remove
export type IBindingsAggregator = IBindingsAggregatorType;

export interface IActorBindingsAggregatorFactoryOutput extends IActorOutput, IBindingsAggregator {}

export interface IActorBindingsAggregatorFactoryArgs<TS = undefined> extends IActorArgs<
IActionBindingsAggregatorFactory,
IActorTest,
IActorBindingsAggregatorFactoryOutput,
TS
> {
  mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
}

export type MediatorBindingsAggregatorFactory = Mediate<
IActionBindingsAggregatorFactory,
IActorBindingsAggregatorFactoryOutput
>;
