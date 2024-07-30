import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

export class GreaterThan extends RegularFunction {
  public constructor(private readonly lessThanFunction: RegularFunction) {
    super();
  }

  protected arity = 2;

  public operator = RegularOperator.GT;

  protected overloads = declare(RegularOperator.GT)
    .set([ 'term', 'term' ], expressionEvaluator =>
      ([ first, second ]) =>
        // X < Y -> Y > X
        this.lessThanFunction.applyOnTerms([ second, first ], expressionEvaluator))
    .collect();
}
