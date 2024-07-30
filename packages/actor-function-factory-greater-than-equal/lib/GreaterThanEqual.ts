import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

export class GreaterThanEqual extends RegularFunction {
  public constructor(private readonly lessThanEqualFunction: RegularFunction) {
    super();
  }

  protected arity = 2;

  public operator = RegularOperator.GTE;
  protected overloads = declare(RegularOperator.GTE)
    .set([ 'term', 'term' ], exprEval =>
      ([ first, second ]) =>
        // X >= Y -> Y <= X
        this.lessThanEqualFunction.applyOnTerms([ second, first ], exprEval))
    .collect();
}
