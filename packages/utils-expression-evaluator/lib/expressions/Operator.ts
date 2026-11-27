import type {
  Expression,
  FunctionApplication,
  OperatorExpression,
  SynchronousFunctionApplication,
} from '@comunica/types';
import { ExpressionType } from '@comunica/types';

export class Operator implements OperatorExpression {
  public expressionType: ExpressionType.Operator = ExpressionType.Operator;

  public constructor(
    public name: string,
    public args: Expression[],
    public apply: FunctionApplication,
    public applySynchronously?: SynchronousFunctionApplication,
  ) {}
}
