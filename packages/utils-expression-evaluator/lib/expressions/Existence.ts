import type { Algebra as Alg } from '@comunica/algebra-sparql-comunica';
import type { ExistenceExpression } from '@comunica/types';
import { ExpressionType } from '@comunica/types';

export class Existence implements ExistenceExpression {
  public expressionType: ExpressionType.Existence = ExpressionType.Existence;
  public constructor(public expression: Alg.ExistenceExpression) {}
}
