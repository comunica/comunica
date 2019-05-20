import { Algebra as Alg } from 'sparqlalgebrajs';

import {
  AggregateExpression,
  ExpressionType,
} from './Expressions';

export class Aggregate implements AggregateExpression {
  expressionType: ExpressionType.Aggregate = ExpressionType.Aggregate;

  constructor(
    public name: string,
    public expression: Alg.AggregateExpression,
  ) { }
}
