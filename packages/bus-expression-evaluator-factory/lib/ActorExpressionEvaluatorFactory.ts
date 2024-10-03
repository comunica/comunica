import type { MediatorFunctionFactory, MediatorFunctionFactoryUnsafe } from '@comunica/bus-function-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IExpressionEvaluator } from '@comunica/expression-evaluator';
import type { Algebra as Alg } from 'sparqlalgebrajs';

/**
 * A comunica actor for expression-evaluator-factory events.
 *
 * Actor types:
 * * Input:  IActionExpressionEvaluatorFactory: The Query Operation and Function factory mediators.
 * * Test:   <none>
 * * Output: IActorExpressionEvaluatorFactoryOutput: TODO: fill in.
 *
 * @see IActionExpressionEvaluatorFactory
 * @see IActorExpressionEvaluatorFactoryOutput
 */
export abstract class ActorExpressionEvaluatorFactory<TS = undefined> extends
  Actor<IActionExpressionEvaluatorFactory, IActorTest, IActorExpressionEvaluatorFactoryOutput, TS> {
  protected mediatorQueryOperation: MediatorQueryOperation;
  protected mediatorFunctionFactory: MediatorFunctionFactory;
  protected mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorExpressionEvaluatorFactoryArgs<TS>) {
    super(args);
    this.mediatorQueryOperation = args.mediatorQueryOperation;
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }
}

export interface IActionExpressionEvaluatorFactory extends IAction {
  algExpr: Alg.Expression;
}

export interface IActorExpressionEvaluatorFactoryOutput extends IActorOutput, IExpressionEvaluator {}

export interface IActorExpressionEvaluatorFactoryArgs<TS = undefined> extends IActorArgs<
IActionExpressionEvaluatorFactory,
IActorTest,
IActorExpressionEvaluatorFactoryOutput,
TS
> {
  mediatorQueryOperation: MediatorQueryOperation;
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}

export type MediatorExpressionEvaluatorFactory = Mediate<
IActionExpressionEvaluatorFactory,
IActorExpressionEvaluatorFactoryOutput
>;
