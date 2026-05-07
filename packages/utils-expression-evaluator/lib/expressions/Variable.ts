import type { VariableExpression } from '@comunica/types';
import { ExpressionType } from '@comunica/types';

/**
 * Represents a SPARQL variable reference within an expression.
 */
export class Variable implements VariableExpression {
  public expressionType: ExpressionType.Variable = ExpressionType.Variable;
  public name: string;
  public constructor(name: string) {
    this.name = name;
  }
}
