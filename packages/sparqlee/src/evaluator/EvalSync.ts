import * as RDFJS from 'rdf-js';
import * as S from 'sparqljs';
import fromString from 'termterm.js';

import * as E from './expressions/Types';
import * as T from './expressions/Terms';
import * as Ops from './expressions/Operators';

import { ExpressionEvaluator } from './ExpressionEvaluator';
import { Mapping } from '../core/Mapping';
// TODO: Make this import more clear/elegant
import { TermTypes as TT, ExpressionTypes as ET } from '../util/Consts';


/**
 * Benchmarking this provides a theoretical maximum
 * Will only evaluate specific examples correctly.
 */
export class SyncEvaluator implements ExpressionEvaluator {
    expr: E.Expression;

    constructor(expr: S.Expression) {
        this.expr = this._transform(expr);
    }

    evaluate(mapping: Mapping): boolean {
        return this.evalExpr(this.expr, mapping).toEBV();
    }

    evalExpr(expr: E.Expression, mapping: Mapping): T.Term {
        switch (expr.exprType) {
            case E.ExpressionType.Term: return <T.Term>expr;
            case E.ExpressionType.Variable: {
                let variable = <E.VariableExpression>expr;
                let rdfTerm = mapping.get(variable.name);
                let term = this._toTerm(rdfTerm);
                if (term) { return term; }
                throw Error;
            };
            case E.ExpressionType.Operation: return undefined;
            case E.ExpressionType.FunctionCall: return undefined;
            case E.ExpressionType.Aggregate: return undefined;
            case E.ExpressionType.BGP: return undefined;
            case E.ExpressionType.Group: return undefined;
            case E.ExpressionType.Tuple: return undefined;
            default: return undefined;
        }
    }

    _transform(expr: S.Expression): E.Expression {
        if (typeof expr == 'string') {
            let term = fromString(expr);
            return this._toInternal(term);
        }

        // SPARQL.js represents Tuples as arrays
        if (expr instanceof Array) {
            return new E.Tuple(expr.map((sexpr) => this._transform(sexpr)));
        }

        expr = <S.OperationExpression
            | S.FunctionCallExpression
            | S.AggregateExpression
            | S.BgpPattern
            | S.GroupPattern>expr;

        switch (expr.type) {
            case ET.Operation: {
                let args = expr.args.map(this._transform);
                switch (expr.operator) {
                    case '&&': return new Ops.And(args);
                    case '||': return new Ops.Or(args);
                    case '!': return undefined;
                    case '=': return undefined;
                    case '!=': return undefined;
                    case '<': return undefined;
                    case '>': return undefined;
                    case '<=': return undefined;
                    case '>=': return undefined;
                    case '*': return undefined;
                    case '/': return undefined;
                    case '+': return undefined;
                    case '-': return undefined;
                }
            };
            case ET.FunctionCall: return undefined;
            case ET.Aggregate: return undefined;
            case ET.BGP: return undefined;
            case ET.Group: return undefined;
        }
    }

    _toInternal(term: RDFJS.Term): E.Expression {
        switch (term.termType) {
            case 'Variable': return new E.VariableExpression(term.value);
            default: return this._toTerm(term);
        }
    }

    _toTerm(term: RDFJS.Term): T.Term {
        switch (term.termType) {
            case 'NamedNode': return new T.NamedNode(term.value);
            case 'BlankNode': return new T.BlankNode(term.value);
            case 'DefaultGraph': return new T.DefaultGraph();
            case 'Literal': return undefined; // TODO
            case 'Variable': return undefined; // A variable is not a valid term
            default: throw TypeError;
        }
    }
}

