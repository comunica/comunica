import type { Algebra as Alg } from 'sparqlalgebrajs';
import type { AggregateExpression } from './Expressions';
import { ExpressionType } from './Expressions';
export declare class Aggregate implements AggregateExpression {
    name: string;
    expression: Alg.AggregateExpression;
    expressionType: ExpressionType.Aggregate;
    constructor(name: string, expression: Alg.AggregateExpression);
}
