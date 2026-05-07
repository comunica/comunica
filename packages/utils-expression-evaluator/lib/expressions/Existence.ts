import type { ExistenceExpression } from '@comunica/types';
import { ExpressionType } from '@comunica/types';
import type { Algebra as Alg } from '@comunica/utils-algebra';

/**
 * Represents a SPARQL EXISTS or NOT EXISTS expression.
 */
export class Existence implements ExistenceExpression {
  public expressionType: ExpressionType.Existence = ExpressionType.Existence;
  /**
   * Creates a new Existence expression.
   * @param expression The underlying algebra existence expression.
   */
  public constructor(public expression: Alg.ExistenceExpression) {}
}
