import { Expression, OperationExpression } from 'sparqljs';
import { Literal } from 'rdf-js';
import fromString from 'termterm.js';
import * as RDF from 'rdf-data-model';

import { evaluate } from '../src/__tests__/util/Evaluation';
import { ExpressionEvaluator } from '../src/evaluator/ExpressionEvaluator';
import { Mapping } from '../src/core/Mapping';
import { TermTypes as TT, ExpressionTypes as ET } from '../src/util/Consts';

/**
 * Benchmarking this provides a theoretical maximum
 * Will only evaluate specific examples correctly.
 */
export class ManualEvaluator implements ExpressionEvaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping) :Literal {
        return this.evalExpr(this.expr, mapping);
    }

    evalExpr(expr: Expression, mapping: Mapping) :Literal {
        // Term
        if (typeof expr == 'string'){
            const term = fromString(expr)
            switch (term.termType) {
                case TT.Variable: {
                    return mapping.get(term.value) as Literal;
                }
                case TT.Literal: {
                    return term as Literal;
                }
            }
        
        // Operation
        } else {
            expr = expr as OperationExpression;
            var left = this.evalExpr(expr.args[0], mapping);
            var right = this.evalExpr(expr.args[1], mapping);
            switch (expr.operator) {
                case '=': {
                    const result = Number(left.value) == Number(right.value);
                    return boolToLiteral(result);
                }
                case '>': {
                    const result = new Date(left.value) > new Date(right.value);
                    return boolToLiteral(result);
                }
                case '&&': {
                    const result = (left.value == 'true') && (right.value == 'true');
                    return boolToLiteral(result);
                }
                case '+': {
                    const result = Number(left.value) + Number(right.value);
                    return RDF.literal(result.toString(), RDF.namedNode('xsd:integer'));
                }
            }
        }
    }
}

function boolToLiteral(bool: boolean): Literal{
    return RDF.literal(String(bool), RDF.namedNode('xsd:boolean'));
}