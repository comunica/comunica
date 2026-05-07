import type { AggregateExpression } from '@comunica/types';
import { ExpressionType } from '@comunica/types';
import type { Algebra as Alg } from '@comunica/utils-algebra';

/**
 * Represents a SPARQL aggregate expression such as COUNT, SUM, or AVG.
 */
export class Aggregate implements AggregateExpression {
  public expressionType: ExpressionType.Aggregate = ExpressionType.Aggregate;

  /**
   * Creates a new Aggregate.
   * @param name The name of the aggregate function.
   * @param expression The underlying algebra aggregate expression.
   */
  public constructor(
    public name: string,
    public expression: Alg.AggregateExpression,
  ) {}
}
