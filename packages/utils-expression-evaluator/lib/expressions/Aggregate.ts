import type { Algebra as Alg } from '@comunica/algebra-sparql-comunica';
import type { AggregateExpression } from '@comunica/types';
import { ExpressionType } from '@comunica/types';

export class Aggregate implements AggregateExpression {
  public expressionType: ExpressionType.Aggregate = ExpressionType.Aggregate;

  public constructor(
    public name: string,
    public expression: Alg.AggregateExpression,
  ) {}
}
