import type { VariableExpression } from './Expressions.js';
import { ExpressionType } from './Expressions.js';

export class Variable implements VariableExpression {
  public expressionType: ExpressionType.Variable = ExpressionType.Variable;
  public name: string;
  public constructor(name: string) {
    this.name = name;
  }
}
