import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  bool,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-isNumeric
 */
export class IsNumeric extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IS_NUMERIC;

  protected overloads = declare(RegularOperator.IS_NUMERIC)
    .onNumeric1(() => () => bool(true))
    .onTerm1(() => () => bool(false))
    .collect();
}
