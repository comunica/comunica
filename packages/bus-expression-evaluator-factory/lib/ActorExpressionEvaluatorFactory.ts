import type {
  MediatorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorFunctions,
  MediatorFunctionsUnsafe } from '@comunica/bus-functions';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IExpressionEvaluator } from '@comunica/expression-evaluator';
import type { Algebra as Alg } from 'sparqlalgebrajs';

/**
 * A comunica actor for expression-evaluator-factory events.
 *
 * Actor types:
 * * Input:  IActionExpressionEvaluatorFactory:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorExpressionEvaluatorFactoryOutput: TODO: fill in.
 *
 * @see IActionExpressionEvaluatorFactory
 * @see IActorExpressionEvaluatorFactoryOutput
 */
export abstract class ActorExpressionEvaluatorFactory extends
  Actor<IActionExpressionEvaluatorFactory, IActorTest, IActorExpressionEvaluatorFactoryOutput> {
  public mediatorQueryOperation: MediatorQueryOperation;
  public mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  public mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  public mediatorFunctions: MediatorFunctions;

  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  public constructor(args: IActorExpressionEvaluatorFactoryArgs) {
    super(args);
  }
}

export interface IActionExpressionEvaluatorFactory extends IAction {
  algExpr: Alg.Expression;
}

export interface IActorExpressionEvaluatorFactoryOutput extends IActorOutput, IExpressionEvaluator {}

export interface IActorExpressionEvaluatorFactoryArgs extends IActorArgs<
IActionExpressionEvaluatorFactory, IActorTest, IActorExpressionEvaluatorFactoryOutput> {
  mediatorQueryOperation: MediatorQueryOperation;
  mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  mediatorFunctions: MediatorFunctionsUnsafe;
}

export type MediatorExpressionEvaluatorFactory = Mediate<
IActionExpressionEvaluatorFactory, IActorExpressionEvaluatorFactoryOutput>;
