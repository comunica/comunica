import {SparqlExpressionEvaluator} from "@comunica/actor-query-operation-filter-direct";
import {ActorQueryOperation, ActorQueryOperationTypedMediated,
  IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {termToString} from "rdf-string";
import {Algebra} from "sparqlalgebrajs";
import {SortIterator} from "./SortIterator";

/**
 * A comunica OrderBy Direct Query Operation Actor.
 */
export class ActorQueryOperationOrderByDirect extends ActorQueryOperationTypedMediated<Algebra.OrderBy> {

  private window: number;

  constructor(args: IActorQueryOperationOrderByDirectArgs) {
    super(args, 'orderby');
    this.window = args.window || Infinity;
  }

  public async testOperation(pattern: Algebra.OrderBy, context: ActionContext): Promise<IActorTest> {
    // will throw error for unsupported operators
    for (let expr of pattern.expressions) {
      // remove descending operator
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

  public async runOperation(pattern: Algebra.OrderBy, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    const output: IActorQueryOperationOutputBindings =
      ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate(
        { operation: pattern.input, context }));

    const options = { window: this.window };
    let bindingsStream = output.bindingsStream;
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
      bindingsStream = new SortIterator(bindingsStream, (a, b) => {
        const orderA = termToString(order(a));
        const orderB = termToString(order(b));
        if (!orderA || !orderB) {
          return 0;
        }
        return orderA > orderB === ascending ? 1 : -1;
      }, options);
    }

    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables: output.variables };
  }

}

/**
 * The window parameter determines how many of the elements to consider when sorting.
 */
export interface IActorQueryOperationOrderByDirectArgs extends IActorQueryOperationTypedMediatedArgs {
  window?: number;
}
