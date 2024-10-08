import type { VariableExpression } from '@comunica/types';
import { ExpressionType } from '@comunica/types';

export class Variable implements VariableExpression {
  public expressionType: ExpressionType.Variable = ExpressionType.Variable;
  public name: string;
  public constructor(name: string) {
    this.name = name;
  }
}
