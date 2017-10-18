import * as RDF from 'rdf-data-model';
import { Literal, Term } from 'rdf-js';
import { Expression } from "sparqljs";

import { TRUE, FALSE } from "../util/Consts"
import { Mapping } from "../core/Mapping";

export class ExpressionEvaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping) :Literal {
        return TRUE;
    }
}