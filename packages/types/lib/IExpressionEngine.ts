import type { Algebra } from '@comunica/utils-algebra';
import type { IBindingsAggregator, IExpressionEvaluator, ITermComparator } from './ExpressionEvaluator';
import type { IActionContext } from './IActionContext';

/**
 * Base interface for a Comunica expression engine, which evaluates SPARQL expressions without executing queries.
 */
export interface IExpressionEngine {
  /**
   * Create an evaluator for a SPARQL expression, such as the expression of a `FILTER` clause.
   * @param expression The algebra of the expression to evaluate.
   * @param context An optional context, missing entries are defaulted.
   */
  createEvaluator: (expression: Algebra.Expression, context?: IActionContext) => Promise<IExpressionEvaluator>;

  /**
   * Create a comparator that orders RDF terms as `ORDER BY` does.
   * @param context An optional context, missing entries are defaulted.
   */
  createTermComparator: (context?: IActionContext) => Promise<ITermComparator>;

  /**
   * Create an aggregator for a SPARQL aggregate expression, such as `SUM(?x)`.
   * @param expression The algebra of the aggregate expression.
   * @param context An optional context, missing entries are defaulted.
   */
  createAggregator: (expression: Algebra.AggregateExpression, context?: IActionContext) =>
  Promise<IBindingsAggregator>;
}
