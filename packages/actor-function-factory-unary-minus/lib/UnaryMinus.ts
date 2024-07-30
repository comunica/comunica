import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

export class UnaryMinus extends RegularFunction {
  protected arity = 1;

  public operator = RegularOperator.UMINUS;

  protected overloads = declare(RegularOperator.UMINUS)
    .numericConverter(() => val => -val)
    .collect();
}
