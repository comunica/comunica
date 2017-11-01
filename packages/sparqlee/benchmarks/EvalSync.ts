import { evaluate } from '../src/__tests__/util/Evaluation';
import { Literal } from 'rdf-js';
import {
    Expression, OperationExpression, FunctionCallExpression,
    AggregateExpression, BgpPattern, GroupPattern
} from 'sparqljs';
import * as RDF from 'rdf-data-model';
import fromString from 'termterm.js';

import { ExpressionEvaluator } from '../src/evaluator/ExpressionEvaluator';
import { Mapping } from '../src/core/Mapping';
import { TermTypes as TT, ExpressionTypes as ET } from '../src/util/Consts';


/**
 * Benchmarking this provides a theoretical maximum
 * Will only evaluate specific examples correctly.
 */
export class SyncEvaluator implements ExpressionEvaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping): Literal {
        return this.evalExpr(this.expr, mapping);
    }

    /**
     export type Expression =
        | OperationExpression (type: operation)
        | FunctionCallExpression (type: functionCall)
        | AggregateExpression (type: aggregate)
        | BgpPattern (type: bgp)
        | GroupPattern (type: group)
        | Tuple (???)
        | Term :string;
    */
    evalExpr(expr: Expression, mapping: Mapping): Literal {
        // SPARQL.js represents terms as strings
        if (typeof expr == 'string') {
            var term = fromString(expr);
            switch (term.termType) {
                case TT.NamedNode: return undefined;
                case TT.BlankNode: return undefined;
                case TT.Variable: return undefined;
                case TT.Literal: return undefined;
                case TT.DefaultGraph: return undefined;
                default: return undefined;
            }
        }

        // TODO: Find out what tuples are used for
        // SPARQL.js represents Tuples as arrays
        if (expr instanceof Array) {
            return undefined;
        }

        // Add type information about remaining possibility of Expression values
        expr = <OperationExpression
            | FunctionCallExpression
            | AggregateExpression
            | BgpPattern
            | GroupPattern>expr;

        switch (expr.type) {
            case ET.Operation: return undefined;
            case ET.FunctionCall: return undefined;
            case ET.Aggregate: return undefined;
            case ET.BGP: return undefined;
            case ET.Group: return undefined;
        }
    }
}

function boolToLiteral(bool: boolean): Literal {
    return RDF.literal(String(bool), RDF.namedNode('xsd:boolean'));
}
