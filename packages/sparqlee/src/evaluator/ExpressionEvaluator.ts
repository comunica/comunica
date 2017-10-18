import { Mapping } from "../core/Mapping";
import { Term } from 'rdf-js'
import { Expression } from "sparqljs";

export class ExpressionEvaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping) {
        
    }
}