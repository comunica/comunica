import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-abs
 */
export class Abs extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.ABS;

  protected overloads = declare(RegularOperator.ABS)
    .numericConverter(() => num => Math.abs(num))
    .collect();
}
