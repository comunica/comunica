import {
  Expression,
  ExpressionType,
  SpecialApplicationAsync,
  SpecialApplicationSync,
  SpecialOperatorExpression,
} from './Expressions';

export class SpecialOperator implements SpecialOperatorExpression {
  expressionType: ExpressionType.SpecialOperator = ExpressionType.SpecialOperator;

  constructor(
    public args: Expression[],
    public applyAsync: SpecialApplicationAsync,
    public applySync: SpecialApplicationSync,
  ) { }
}
