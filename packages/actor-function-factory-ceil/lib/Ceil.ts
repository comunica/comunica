import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-ceil
 */
export class Ceil extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.CEIL;

  protected overloads = declare(RegularOperator.CEIL)
    .numericConverter(() => num => Math.ceil(num))
    .collect();
}
