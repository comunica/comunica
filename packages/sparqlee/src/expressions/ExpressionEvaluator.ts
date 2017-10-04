import { Mapping } from "../core/Mapping";
import { Expression } from "./Expression";

export class ExpressionEvaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping) {
        console.log(this.expr);
    }
}