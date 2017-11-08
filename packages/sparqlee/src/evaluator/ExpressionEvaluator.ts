import { evaluate } from '../__tests__/util/Evaluation';
import * as RDF from 'rdf-data-model';
import { Expression } from "sparqljs";

import { Mapping } from "../core/Mapping";

export interface ExpressionEvaluator {
    evaluate(mapping: Mapping) :boolean;
}

export class AsyncEvaluator implements ExpressionEvaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping) :boolean {
        return true;
    }
}