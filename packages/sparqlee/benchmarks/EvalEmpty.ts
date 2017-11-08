import { Expression } from 'sparqljs';
import { Literal } from 'rdf-js';
import { ExpressionEvaluator } from '../src/evaluator/ExpressionEvaluator';
import { Mapping } from '../src/core/Mapping';


/**
 * Benchmarking this provides a (very lose) theoretical maximum
 */
export class EmptyEvaluator implements ExpressionEvaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping) :boolean {
        return null;
    }
}
