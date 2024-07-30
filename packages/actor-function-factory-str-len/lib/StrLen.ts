import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  integer,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strlen
 */
export class StrLen extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.STRLEN;

  protected overloads = declare(RegularOperator.STRLEN)
    .onStringly1(() => str => integer([ ...str.typedValue ].length))
    .collect();
}
