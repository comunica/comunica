import type { Expression,
  OperatorExpression,
  SimpleApplication } from './Expressions';
import {
  ExpressionType,
} from './Expressions';

export class Operator implements OperatorExpression {
  public expressionType: ExpressionType.Operator = ExpressionType.Operator;

  public constructor(public args: Expression[], public apply: SimpleApplication) { }
}
