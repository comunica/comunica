import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

export class Abs extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.ABS;

  protected overloads = declare(RegularOperator.ABS)
    .numericConverter(() => num => Math.abs(num))
    .collect();
}
