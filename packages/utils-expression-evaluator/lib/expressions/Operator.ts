import type { Expression, FunctionApplication, OperatorExpression } from '@comunica/types';
import { ExpressionType } from '@comunica/types';

/**
 * Represents a SPARQL operator expression (built-in function or custom extension).
 */
export class Operator implements OperatorExpression {
  public expressionType: ExpressionType.Operator = ExpressionType.Operator;

  /**
   * Creates a new Operator expression.
   * @param name The name of the operator.
   * @param args The argument expressions to the operator.
   * @param apply The function that evaluates the operator.
   */
  public constructor(public name: string, public args: Expression[], public apply: FunctionApplication) {}
}
