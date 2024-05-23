import type { FunctionApplication } from '../functions/OverloadTree';
import type { Expression, SpecialOperatorExpression } from './Expressions';
import {
  ExpressionType,
} from './Expressions';

export class SpecialOperator implements SpecialOperatorExpression {
  public expressionType: ExpressionType.SpecialOperator = ExpressionType.SpecialOperator;

  public constructor(
    public args: Expression[],
    public apply: FunctionApplication,
  ) {}
}
