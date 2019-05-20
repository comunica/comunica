import { Algebra as Alg } from 'sparqlalgebrajs';

import { ExistenceExpression, ExpressionType } from './Expressions';

export class Existence implements ExistenceExpression {
  expressionType: ExpressionType.Existence = ExpressionType.Existence;
  constructor(public expression: Alg.ExistenceExpression) { }
}
