import { Algebra } from 'sparqlalgebrajs';

import {
  Bindings,
  IActionQueryOperation,
  IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings,
} from '@comunica/bus-query-operation';
import { Actor, IAction, IActorArgs, IActorOutput, IActorTest, Mediator } from "@comunica/core";

/**
 * A comunica actor for query-operation-expression events.
 *
 * For Aggregate, Existence and Named expressions.
 *
 * Actor types:
 * * Input:  IActionQueryOperationExpression
 * * Test:   <none>
 * * Output: IActorQueryOperationExpressionOutput
 *
 * @see IActionQueryOperationExpression
 * @see IActorQueryOperationExpressionOutput
 */
export abstract class ActorQueryOperationExpression<Result> extends
  Actor<IActionQueryOperationExpression, IActorTest, IActorQueryOperationExpressionOutput<Result>> {

  public readonly mediatorQueryOperation: QueryOperationMediator;

  protected expressionType: 'aggregate' | 'existence' | 'named';

  constructor(
    args: IActorArgs<IActionQueryOperationExpression, IActorTest, IActorQueryOperationExpressionOutput<Result>>,
    expressionType: 'aggregate' | 'existence' | 'named',
  ) {
    super(args);
    this.expressionType = expressionType;
  }

  public async test(action: IActionQueryOperationExpression): Promise<IActorTest> {
    return action.expression.expressionType === this.expressionType;
  }

}

export interface IActorQueryOperationExpressionArgs<Result>
  extends IActorArgs<IActionQueryOperationExpression, IActorTest, IActorQueryOperationExpressionOutput<Result>> {
  mediatorQueryOperation: QueryOperationMediator;
}

export interface IActionQueryOperationExpression extends IAction {
  expression: Algebra.Expression;
  operationOutputBindings: IActorQueryOperationOutputBindings;
  bindings?: Bindings;
}

export interface IActorQueryOperationExpressionOutput<Result> extends IActorOutput {
  result: Result;
}

type QueryOperationMediator = Mediator<
  Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
  IActionQueryOperation,
  IActorTest,
  IActorQueryOperationOutput
  >;
