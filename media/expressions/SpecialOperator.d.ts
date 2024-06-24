import type { Expression, SpecialApplicationAsync, SpecialApplicationSync, SpecialOperatorExpression } from './Expressions';
import { ExpressionType } from './Expressions';
export declare class SpecialOperator implements SpecialOperatorExpression {
    args: Expression[];
    applyAsync: SpecialApplicationAsync;
    applySynchronously: SpecialApplicationSync;
    expressionType: ExpressionType.SpecialOperator;
    constructor(args: Expression[], applyAsync: SpecialApplicationAsync, applySynchronously: SpecialApplicationSync);
}
