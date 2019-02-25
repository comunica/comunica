import { Algebra } from 'sparqlalgebrajs';

import {
  ActorQueryOperation,
  IActorQueryOperationOutputBindings,
} from '@comunica/bus-query-operation';
import {
  ActorQueryOperationExpression,
  IActionQueryOperationExpression,
  IActorQueryOperationExpressionArgs,
  IActorQueryOperationExpressionOutput,
} from "@comunica/bus-query-operation-expression";
import { IActorArgs, IActorTest } from "@comunica/core";

/**
 * A comunica Exists Query Operation Expression Actor.
 */
export class ActorQueryOperationExpressionExists extends ActorQueryOperationExpression<boolean> {

  constructor(args: IActorQueryOperationExpressionArgs<boolean>) {
    super(args, "existence");
  }

  public async run(action: IActionQueryOperationExpression): Promise<IActorQueryOperationExpressionOutput<boolean>> {
    const existenceExpression = action.expression as Algebra.ExistenceExpression;
    const { operationOutputBindings, bindings } = action;
    const { bindingsStream, variables } = operationOutputBindings;
    const { not, operation } = existenceExpression;

    // TODO: Check if mediatorquery exists;

    // const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
    //   await this.mediatorQueryOperation.mediate({ operation }));

    // TODO
    return Promise.resolve({ result: true });
  }

}
