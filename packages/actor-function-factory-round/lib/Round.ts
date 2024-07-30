import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-round
 */
export class Round extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.ROUND;

  protected overloads = declare(RegularOperator.ROUND)
    .numericConverter(() => num => Math.round(num))
    .collect();
}
