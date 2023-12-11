import type { MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IMediatorFunctions,
  IMediatorTermComparator,
  IExpressionFunction,
  IFunctionBusActionContext,
  ITermFunction,
  IOrderByEvaluator,
  ITermComparatorBusActionContext,
  IExpressionEvaluator,
  IActionContext, IBindingsAggregator } from '@comunica/types';
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
  public mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  public mediatorQueryOperation: MediatorQueryOperation;
  public mediatorFunctions: IMediatorFunctions;
  public mediatorTermComparator: IMediatorTermComparator;

  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  public constructor(args: IActorExpressionEvaluatorFactoryArgs) {
    super(args);
  }

  public abstract createFunction<T extends IFunctionBusActionContext>(arg: T & IAction):
  Promise<T extends { requireTermExpression: true } ? ITermFunction : IExpressionFunction>;

  public abstract createTermComparator(orderAction: ITermComparatorBusActionContext):
  Promise<IOrderByEvaluator>;

  public abstract createAggregator(algExpr: Alg.AggregateExpression, context: IActionContext):
  Promise<IBindingsAggregator>;
}

export interface IActionExpressionEvaluatorFactory extends IAction {
  mediatorFunctions?: IMediatorFunctions;
  mediatorTermComparator?: IMediatorTermComparator;
  algExpr: Alg.Expression;
}

export interface IActorExpressionEvaluatorFactoryOutput extends IActorOutput {
  expressionEvaluator: IExpressionEvaluator;
}

export type IActorExpressionEvaluatorFactoryArgs = IActorArgs<
IActionExpressionEvaluatorFactory, IActorTest, IActorExpressionEvaluatorFactoryOutput> & {
  mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  mediatorQueryOperation: MediatorQueryOperation;
  mediatorFunctions?: IMediatorFunctions;
  mediatorTermComparator?: IMediatorTermComparator;
};

export type MediatorExpressionEvaluatorFactory = Mediate<
IActionExpressionEvaluatorFactory, IActorExpressionEvaluatorFactoryOutput>;
