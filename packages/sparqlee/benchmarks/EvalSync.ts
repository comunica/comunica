import { evaluate } from '../src/__tests__/util/Evaluation';
import { Expression, OperationExpression, FunctionCallExpression,
         AggregateExpression, BgpPattern, GroupPattern } from 'sparqljs';
import { Literal } from 'rdf-js';
import * as RDF from 'rdf-data-model';
import { ExpressionEvaluator } from '../src/evaluator/ExpressionEvaluator';
import { Mapping } from '../src/core/Mapping';
import fromString from 'termterm.js'


/**
 * Benchmarking this provides a theoretical maximum
 * Will only evaluate specific examples correctly.
 */
export class SyncEvaluator implements ExpressionEvaluator {
    expr: Expression;

    constructor(expr: Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping) :Literal {
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
        | Term ();
    */
    // TODO: make termType enum
    evalExpr(expr: Expression, mapping: Mapping) :Literal {
        // SPARQL.js represents terms as strings
        if (typeof expr == 'string') {
            var term = fromString(expr);
            switch (term.termType) {
                case 'NamedNode': return undefined;
                case 'BlankNode': return undefined;
                case 'Variable': return undefined;
                case 'Literal': return undefined;
                case 'DefaultGraph': return undefined;
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
            | GroupPattern> expr;

        switch (expr.type) {
            case 'operation': return undefined;
            case 'functionCall': return undefined;
            case 'aggregate': return undefined;
            case 'bgp': return undefined;
            case 'group': return undefined;
        }
    }
}

function boolToLiteral(bool: boolean): Literal{
    return RDF.literal(String(bool), RDF.namedNode('xsd:boolean'));
}
