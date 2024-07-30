import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  double,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#idp2130040
 */
export class Rand extends RegularFunction {
  protected arity = 0;
  public operator = RegularOperator.RAND;

  protected overloads = declare(RegularOperator.RAND)
    .set([], () => () => double(Math.random()))
    .collect();
}
