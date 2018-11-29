import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';

import { BindingsStream } from '@comunica/bus-query-operation';
import { Actor, IAction, IActorArgs, IActorOutput, IActorTest } from "@comunica/core";

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

export interface IActionQueryOperationExpression extends IAction {
  expression: Algebra.Expression;
  bindingsStream: BindingsStream;
}

export interface IActorQueryOperationExpressionOutput<Result> extends IActorOutput {
  result: Result;
}
