import { Mapping } from "../core/Mapping";
import { RDFTerm, RDFTermTypes } from "../core/RDFTerm";
import { Expression } from "sparqljs";

export class ExpressionEvaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping) {
        console.log(this.expr);
    }

    evaluateExampleQueryByHand(mapping: Mapping) {

    }
}