import { Expression } from 'sparqljs';
import { Literal } from 'rdf-js';
import { Evaluator } from '../src/core/Evaluator';
import { Bindings } from "../src/core/Bindings";


/**
 * Benchmarking this provides a (very lose) theoretical maximum
 */
export class EmptyEvaluator implements Evaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Bindings) :boolean {
        return null;
    }
}
