import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-floor
 */
export class Floor extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.FLOOR;

  protected overloads = declare(RegularOperator.FLOOR)
    .numericConverter(() => num => Math.floor(num))
    .collect();
}
