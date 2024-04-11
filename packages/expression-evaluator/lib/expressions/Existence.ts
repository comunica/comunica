import type { Algebra as Alg } from 'sparqlalgebrajs';

import type { ExistenceExpression } from './Expressions';
import { ExpressionType } from './Expressions';

export class Existence implements ExistenceExpression {
  public expressionType: ExpressionType.Existence = ExpressionType.Existence;
  public constructor(public expression: Alg.ExistenceExpression) {}
}
