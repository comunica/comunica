import type {
  Expression,
  SpecialApplicationAsync,
  SpecialApplicationSync,
  SpecialOperatorExpression,
} from './Expressions.js';
import {
  ExpressionType,
} from './Expressions.js';

export class SpecialOperator implements SpecialOperatorExpression {
  public expressionType: ExpressionType.SpecialOperator = ExpressionType.SpecialOperator;

  public constructor(
    public args: Expression[],
    public applyAsync: SpecialApplicationAsync,
    public applySynchronously: SpecialApplicationSync,
  ) {}
}
