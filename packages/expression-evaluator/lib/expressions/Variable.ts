import type { VariableExpression } from './Expressions';
import { ExpressionType } from './Expressions';

export class Variable implements VariableExpression {
  public expressionType: ExpressionType.Variable = ExpressionType.Variable;
  public name: string;
  public constructor(name: string) {
    this.name = name;
  }
}
