import type { Algebra as Alg } from 'sparqlalgebrajs';
import type { ExistenceExpression } from './Expressions';
import { ExpressionType } from './Expressions';
export declare class Existence implements ExistenceExpression {
    expression: Alg.ExistenceExpression;
    expressionType: ExpressionType.Existence;
    constructor(expression: Alg.ExistenceExpression);
}
