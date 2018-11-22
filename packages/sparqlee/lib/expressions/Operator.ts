import {
  Expression,
  ExpressionType,
  OperatorExpression,
  SimpleApplication,
} from './Expressions';

export class Operator implements OperatorExpression {
  expressionType: ExpressionType.Operator = ExpressionType.Operator;

  constructor(public args: Expression[], public apply: SimpleApplication) { }
}
