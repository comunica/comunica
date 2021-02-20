import * as SparqlExpressionEvaluator from '@comunica/actor-query-operation-filter-direct';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';
import { SortIterator } from './SortIterator';

/**
 * A comunica OrderBy Direct Query Operation Actor.
 */
export class ActorQueryOperationOrderByDirect extends ActorQueryOperationTypedMediated<Algebra.OrderBy> {
  private readonly window: number;

  public constructor(args: IActorQueryOperationOrderByDirectArgs) {
    super(args, 'orderby');
    this.window = args.window ?? Number.POSITIVE_INFINITY;
  }

  public async testOperation(pattern: Algebra.OrderBy, context: ActionContext): Promise<IActorTest> {
    // Will throw error for unsupported operators
    for (let expr of pattern.expressions) {
      // Remove descending operator
      if (expr.expressionType === Algebra.expressionTypes.OPERATOR) {
        const op = <Algebra.OperatorExpression> expr;
        if (op.operator === 'desc') {
          expr = op.args[0];
        }
      }
      SparqlExpressionEvaluator.createEvaluator(expr);
    }
    return true;
  }

  public async runOperation(pattern: Algebra.OrderBy, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    const output: IActorQueryOperationOutputBindings =
      ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate(
        { operation: pattern.input, context },
      ));

    const options = { window: this.window };
    let { bindingsStream } = output;
    for (let expr of pattern.expressions) {
      let ascending = true;
      if (expr.expressionType === Algebra.expressionTypes.OPERATOR) {
        const op = <Algebra.OperatorExpression> expr;
        if (op.operator === 'desc') {
          ascending = false;
          expr = op.args[0];
        }
      }
      const order = SparqlExpressionEvaluator.createEvaluator(expr);
      bindingsStream = new SortIterator(bindingsStream, (left, right) => {
        const orderA = termToString(order(left));
        const orderB = termToString(order(right));
        if (!orderA || !orderB) {
          return 0;
        }
        return orderA > orderB === ascending ? 1 : -1;
      }, options);
    }

    return {
      type: 'bindings',
      bindingsStream,
      metadata: output.metadata,
      variables: output.variables,
      canContainUndefs: output.canContainUndefs,
    };
  }
}

/**
 * The window parameter determines how many of the elements to consider when sorting.
 */
export interface IActorQueryOperationOrderByDirectArgs extends IActorQueryOperationTypedMediatedArgs {
  window?: number;
}
