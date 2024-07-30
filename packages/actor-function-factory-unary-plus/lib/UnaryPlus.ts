import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

export class UnaryPlus extends RegularFunction {
  protected arity = 1;

  public operator = RegularOperator.UPLUS;

  protected overloads = declare(RegularOperator.UPLUS)
    .numericConverter(() => val => val)
    .collect();
}
