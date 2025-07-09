import type { ITermFunction } from '@comunica/bus-function-factory';
import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  BooleanLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

export class TermFunctionLesserThanEqual extends TermFunctionBase {
  public constructor(
    private readonly lessThanFunction: ITermFunction,
  ) {
    super({
      arity: 2,
      operator: SparqlOperator.LTE,
      overloads: declare(SparqlOperator.LTE)
        .numberTest(() => (left, right) =>
          // Special case for numbers as dictated in the spec: https://www.w3.org/TR/sparql11-query/#OperatorMapping
          // A case that wouldn't work with !(Y < X) is comparing NaN with NaN for example
          // Because both NaN < NaN and NaN = NaN would return false, which is the correct output
          // But !(Nan < NaN) would return true, which is incorrect
          left < right || left === right)
        .set([ 'term', 'term' ], exprEval => ([ first, second ]) =>
          // X <= Y -> !(X > Y) -> !(Y < X)
          bool(!(<BooleanLiteral> this.lessThanFunction.applyOnTerms([ second, first ], exprEval)).typedValue))
        .collect(),
    });
  }
}
