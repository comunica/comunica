import * as RDF from 'rdf-data-model';
import { Literal, Term } from 'rdf-js';
import * as S from 'sparqljs';
import fromString from 'termterm.js';

import { Bindings, IEvaluator } from '../src/core/FilteredStreams';
import { ExpressionTypes as ET, TermTypes as TT } from '../src/util/Consts';

/**
 * Benchmarking this provides a theoretical maximum
 * Will only evaluate specific examples correctly.
 */
export class ManualEvaluator implements IEvaluator {
  private expr: S.Expression;

  constructor(expr: S.Expression) {
    this.expr = expr;
  }

  public evaluate(mapping: Bindings): boolean {
    return this.evalExpr(this.expr, mapping).value === "true";
  }

  private evalExpr(expr: S.Expression, mapping: Bindings): Term {
    // ((?age + ?otherAge) = "50"^^xsd:integer) && (?joinYear > "2005-01-01T00:00:00Z"^^xsd:dateTime)
    const and = expr as S.OperationExpression;
    const eq = and.args[0] as S.OperationExpression;
    const gt = and.args[1] as S.OperationExpression;

    // Eq
    const sum = eq.args[0] as S.OperationExpression;
    const litAge = eq.args[1] as S.Term;
    const age = sum.args[0] as S.Term;
    const otherAge = sum.args[1] as S.Term;

    // Gt
    const joinYear = gt.args[0] as S.Term;
    const litDate = gt.args[1] as S.Term;

    // Parse
    const pLitAge = Number(fromString(litAge).value).valueOf();
    const pAge = Number(mapping.get(fromString(age).value).value).valueOf();
    const pOtherAge = Number(mapping.get(fromString(otherAge).value).value).valueOf();
    const pJoinYear = new Date(mapping.get(fromString(joinYear).value).value);
    const pLitDate = new Date(fromString(litDate).value);

    // Evaluate
    const value = ((pAge + pOtherAge) === pLitAge) && (pJoinYear > pLitDate);
    return boolToLiteral(value);
  }
}

function boolToLiteral(bool: boolean): Literal {
  return RDF.literal(String(bool), RDF.namedNode('xsd:boolean'));
}
