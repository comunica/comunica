import { evaluate } from '../__tests__/util/Evaluation';
import * as RDF from 'rdf-data-model';
import { Literal, Term } from 'rdf-js';
import { Expression } from "sparqljs";

import { TRUE, FALSE } from "../util/Consts"
import { Mapping } from "../core/Mapping";

export interface ExpressionEvaluator {
    evaluate(mapping: Mapping) :Literal;
}

export class AsyncEvaluator implements ExpressionEvaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping) :Literal {
        return TRUE;
    }
}