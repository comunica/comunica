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
    private readonly equalityFunction: ITermFunction,
    private readonly lessThanFunction: ITermFunction,
  ) {
    super({
      arity: 2,
      operator: SparqlOperator.LTE,
      overloads: declare(SparqlOperator.LTE)
        .set([ 'term', 'term' ], exprEval =>
          ([ first, second ]) =>
            // X <= Y -> X < Y || X = Y
            // First check if the first is lesser than the second, then check if they are equal.
            // Doing this, the correct error will be thrown,
            // each type that has a lesserThanEqual has a matching lesserThan.
            bool(
              (<BooleanLiteral> this.lessThanFunction.applyOnTerms([ first, second ], exprEval))
                .typedValue ||
              (<BooleanLiteral> this.equalityFunction.applyOnTerms([ first, second ], exprEval))
                .typedValue,
            ))
        .collect(),
    });
  }
}
