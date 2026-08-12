import type { ITermFunction } from '@comunica/bus-function-factory';
import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  BooleanLiteral,
  NumericLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';
import { nonLexicalHandler } from '@comunica/utils-expression-evaluator/lib/functions/Helpers';
import * as C from '@comunica/utils-expression-evaluator/lib/util/Consts';

export class TermFunctionLesserThanEqual extends TermFunctionBase {
  public constructor(
    private readonly lessThanFunction: ITermFunction,
  ) {
    super({
      arity: 2,
      operator: SparqlOperator.LTE,
      overloads: declare(SparqlOperator.LTE)
        // Special case for numbers as dictated in the spec: https://www.w3.org/TR/sparql11-query/#OperatorMapping
        // A case that wouldn't work with !(Y < X) is comparing NaN with NaN for example
        // Because both NaN < NaN and NaN = NaN would return false, which is the correct output
        // But !(Nan < NaN) would return true, which is incorrect
        .set(
          [ C.TypeAlias.SPARQL_NUMERIC, C.TypeAlias.SPARQL_NUMERIC ],
          exprEval => ([ left, right ]: NumericLiteral[]) => {
            const nonLexicalCompare = nonLexicalHandler(exprEval, left, right);
            if (nonLexicalCompare !== undefined) {
              return bool(nonLexicalCompare !== 1);
            }

            return bool(left.typedValue < right.typedValue || left.typedValue === right.typedValue);
          },
          false,
        )
        .set([ 'term', 'term' ], exprEval => ([ left, right ]) =>
          // X <= Y -> !(X > Y) -> !(Y < X)
          bool(!(<BooleanLiteral> this.lessThanFunction.applyOnTerms([ right, left ], exprEval)).typedValue), false)
        .collect(),
    });
  }
}
