import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  langString,
  string,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-lcase
 */
export class Lcase extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.LCASE;

  protected overloads = declare(RegularOperator.LCASE)
    .onString1Typed(() => lit => string(lit.toLowerCase()))
    .onLangString1(() => lit => langString(lit.typedValue.toLowerCase(), lit.language))
    .collect();
}
