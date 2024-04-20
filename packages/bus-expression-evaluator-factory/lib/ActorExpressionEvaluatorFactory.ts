import type { MediatorFunctions,
  MediatorFunctionsUnsafe } from '@comunica/bus-functions';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
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
  protected mediatorQueryOperation: MediatorQueryOperation;
  protected mediatorFunctions: MediatorFunctions;

  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  public constructor(args: IActorExpressionEvaluatorFactoryArgs) {
    super(args);
    this.mediatorQueryOperation = args.mediatorQueryOperation;
    this.mediatorFunctions = <MediatorFunctions> args.mediatorFunctions;
  }
}

export interface IActionExpressionEvaluatorFactory extends IAction {
  algExpr: Alg.Expression;
}

export interface IActorExpressionEvaluatorFactoryOutput extends IActorOutput, IExpressionEvaluator {}

export interface IActorExpressionEvaluatorFactoryArgs extends IActorArgs<
IActionExpressionEvaluatorFactory, IActorTest, IActorExpressionEvaluatorFactoryOutput> {
  mediatorQueryOperation: MediatorQueryOperation;
  mediatorFunctions: MediatorFunctionsUnsafe;
}

export type MediatorExpressionEvaluatorFactory = Mediate<
IActionExpressionEvaluatorFactory, IActorExpressionEvaluatorFactoryOutput>;
