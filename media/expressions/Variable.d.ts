import type { VariableExpression } from './Expressions';
import { ExpressionType } from './Expressions';
export declare class Variable implements VariableExpression {
    expressionType: ExpressionType.Variable;
    name: string;
    constructor(name: string);
}
