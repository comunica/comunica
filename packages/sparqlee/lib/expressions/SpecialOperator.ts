import {
  Expression,
  ExpressionType,
  SpecialApplication,
  SpecialOperatorExpression,
} from './Expressions';

export class SpecialOperatorAsync implements SpecialOperatorExpression {
  expressionType: ExpressionType.SpecialOperator = ExpressionType.SpecialOperator;

  constructor(public args: Expression[], public apply: SpecialApplication) { }
}
