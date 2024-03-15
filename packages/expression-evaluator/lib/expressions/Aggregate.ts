import type { Algebra as Alg } from 'sparqlalgebrajs';

import type { AggregateExpression } from './Expressions';
import {
  ExpressionType,
} from './Expressions';

export class Aggregate implements AggregateExpression {
  public expressionType: ExpressionType.Aggregate = ExpressionType.Aggregate;

  public constructor(
    public name: string,
    public expression: Alg.AggregateExpression,
  ) { }
}
