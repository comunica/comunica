import type { Expression,
  SpecialApplicationAsync,
  SpecialApplicationSync,
  SpecialOperatorExpression } from './Expressions';
import {
  ExpressionType,
} from './Expressions';

export class SpecialOperator implements SpecialOperatorExpression {
  public expressionType: ExpressionType.SpecialOperator = ExpressionType.SpecialOperator;

  public constructor(
    public args: Expression[],
    public applyAsync: SpecialApplicationAsync,
    public applySync: SpecialApplicationSync,
  ) { }
}
