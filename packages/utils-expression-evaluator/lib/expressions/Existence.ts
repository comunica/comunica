import type { ExistenceExpression } from '@comunica/types';
import { ExpressionType } from '@comunica/types';
import type { Algebra as Alg } from '@traqula/algebra-sparql-1-1';

export class Existence implements ExistenceExpression {
  public expressionType: ExpressionType.Existence = ExpressionType.Existence;
  public constructor(public expression: Alg.ExistenceExpression) {}
}
