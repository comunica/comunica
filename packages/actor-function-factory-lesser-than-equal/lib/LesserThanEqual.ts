import { RegularFunction } from '@comunica/bus-function-factory';
import type {
  BooleanLiteral,
} from '@comunica/expression-evaluator';
import {
  RegularOperator,
  bool,
  declare,
} from '@comunica/expression-evaluator';

export class LesserThanEqual extends RegularFunction {
  public constructor(
    private readonly equalityFunction: RegularFunction,
    private readonly lessThanFunction: RegularFunction,
  ) {
    super();
  }

  protected arity = 2;
  public operator = RegularOperator.LTE;
  protected overloads = declare(RegularOperator.LTE)
    .set([ 'term', 'term' ], exprEval =>
      ([ first, second ]) =>
        // X <= Y -> X < Y || X = Y
        // First check if the first is lesser than the second, then check if they are equal.
        // Doing this, the correct error will be thrown, each type that has a lesserThanEqual has a matching lesserThan.
        bool(
          (<BooleanLiteral> this.lessThanFunction.applyOnTerms([ first, second ], exprEval))
            .typedValue ||
          (<BooleanLiteral> this.equalityFunction.applyOnTerms([ first, second ], exprEval))
            .typedValue,
        ))
    .collect();
}
