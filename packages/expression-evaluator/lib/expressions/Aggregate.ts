import type { Algebra as Alg } from 'sparqlalgebrajs';

import type { AggregateExpression } from './Expressions.js';
import {
  ExpressionType,
} from './Expressions.js';

export class Aggregate implements AggregateExpression {
  public expressionType: ExpressionType.Aggregate = ExpressionType.Aggregate;

  public constructor(
    public name: string,
    public expression: Alg.AggregateExpression,
  ) {}
}
