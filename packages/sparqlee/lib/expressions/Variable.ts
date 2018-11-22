import { ExpressionType, VariableExpression } from './Expressions';

export class Variable implements VariableExpression {
  expressionType: ExpressionType.Variable = ExpressionType.Variable;
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
