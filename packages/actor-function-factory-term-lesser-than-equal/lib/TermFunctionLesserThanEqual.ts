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
          ([ first, second ]) => {
            // X <= Y -> X = Y || X < Y
            // We must ensure correct handling of errors following logical-or semantics.

            // First check if the first is lesser than the second.
            let lessThanError: Error | undefined;
            try {
              if ((<BooleanLiteral> this.lessThanFunction.applyOnTerms([ first, second ], exprEval)).typedValue) {
                return bool(true);
              }
            } catch (error) {
              // If an error occurs, store it for later.
              lessThanError = <Error> error;
            }

            // Then check if they are equal, and return if so.
            if ((<BooleanLiteral> this.equalityFunction.applyOnTerms([ first, second ], exprEval))
              .typedValue) {
              return bool(true);
            }

            // If less than produced an error and equals was false, throw the error.
            if (lessThanError) {
              throw lessThanError;
            }

            // In all other cases, return false
            return bool(false);
          })
        .collect(),
    });
  }
}
