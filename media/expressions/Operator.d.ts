import type { Expression, OperatorExpression, SimpleApplication } from './Expressions';
import { ExpressionType } from './Expressions';
export declare class Operator implements OperatorExpression {
    args: Expression[];
    apply: SimpleApplication;
    expressionType: ExpressionType.Operator;
    constructor(args: Expression[], apply: SimpleApplication);
}
