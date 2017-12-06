import * as S from 'sparqljs';
import { Literal, Term } from 'rdf-js';
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
    expr: S.Expression;

    constructor(expr: S.Expression) {
        this.expr = expr;
    }

    evaluate(mapping: Mapping) :boolean {
        return this.evalExpr(this.expr, mapping).value == "true";
    }

    evalExpr(expr: S.Expression, mapping: Mapping) :Term {
        // ((?age + ?otherAge) = "50"^^xsd:integer) && (?joinYear > "2005-01-01T00:00:00Z"^^xsd:dateTime)
        let and = expr as S.OperationExpression;
        let eq = and.args[0] as S.OperationExpression;
        let gt = and.args[1] as S.OperationExpression;
    
        // Eq
        let sum = eq.args[0] as S.OperationExpression;
        let litAge = eq.args[1] as S.Term;
        let age = sum.args[0] as S.Term;
        let otherAge = sum.args[1] as S.Term;

        // Gt
        let joinYear = gt.args[0] as S.Term;
        let litDate = gt.args[1] as S.Term;

        // Parse
        let pLitAge = new Number(fromString(litAge).value).valueOf();
        let pAge = new Number(mapping.get(fromString(age).value).value).valueOf();
        let pOtherAge = new Number(mapping.get(fromString(otherAge).value).value).valueOf();
        let pJoinYear = new Date(mapping.get(fromString(joinYear).value).value);
        let pLitDate = new Date(fromString(litDate).value);

        // Evaluate
        let value = ((pAge + pOtherAge) == pLitAge) && (pJoinYear > pLitDate);
        return boolToLiteral(value);
    }
}

function boolToLiteral(bool: boolean): Literal{
    return RDF.literal(String(bool), RDF.namedNode('xsd:boolean'));
}