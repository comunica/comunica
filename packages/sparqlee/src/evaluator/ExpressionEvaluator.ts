import { Mapping } from "../core/Mapping";
import { Term, TermTypes } from "../core/Term";
import { Expression } from "./../core/Expression";

export class ExpressionEvaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping) {
        console.log(this.expr);
    }
}