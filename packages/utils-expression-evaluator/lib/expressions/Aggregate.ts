import type { AggregateExpression } from '@comunica/types';
import { ExpressionType } from '@comunica/types';
import type { Algebra as Alg } from '@comunica/utils-algebra';

export class Aggregate implements AggregateExpression {
  public expressionType: ExpressionType.Aggregate = ExpressionType.Aggregate;

  public constructor(
    public name: string,
    public expression: Alg.AggregateExpression,
  ) {}
}
