import type {
  IBindingsAggregator,
  MediatorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type {
  IActionFunctions,
  IActorFunctionsOutput,
  IActorFunctionsOutputTerm,
  MediatorFunctions,
} from '@comunica/bus-functions';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { ITermComparator, MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IExpressionEvaluator } from '@comunica/expression-evaluator';
import type { IActionContext } from '@comunica/types';
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

  public abstract createFunction<T extends IActionFunctions>(action: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionsOutputTerm : IActorFunctionsOutput>;

  public abstract createTermComparator(action: IAction):
  Promise<ITermComparator>;

  public abstract createAggregator(algExpr: Alg.AggregateExpression, context: IActionContext):
  Promise<IBindingsAggregator>;
}

export interface IActionExpressionEvaluatorFactory extends IAction {
  algExpr: Alg.Expression;
}

export interface IActorExpressionEvaluatorFactoryOutput extends IActorOutput {
  expressionEvaluator: IExpressionEvaluator;
}

export type IActorExpressionEvaluatorFactoryArgs = IActorArgs<
IActionExpressionEvaluatorFactory, IActorTest, IActorExpressionEvaluatorFactoryOutput> & {
  mediatorQueryOperation: MediatorQueryOperation;
  mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  mediatorFunctions: MediatorFunctions;
};

export type MediatorExpressionEvaluatorFactory = Mediate<
IActionExpressionEvaluatorFactory, IActorExpressionEvaluatorFactoryOutput>;
