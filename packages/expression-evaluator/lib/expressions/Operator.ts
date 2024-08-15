import type { Expression, OperatorExpression, SimpleApplication } from './Expressions.js';
import {
  ExpressionType,
} from './Expressions.js';

export class Operator implements OperatorExpression {
  public expressionType: ExpressionType.Operator = ExpressionType.Operator;

  public constructor(public args: Expression[], public apply: SimpleApplication) {}
}
