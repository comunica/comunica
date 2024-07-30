import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  langString,
  string,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-ucase
 */
export class Ucase extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.UCASE;

  protected overloads = declare(RegularOperator.UCASE)
    .onString1Typed(() => lit => string(lit.toUpperCase()))
    .onLangString1(() => lit => langString(lit.typedValue.toUpperCase(), lit.language))
    .collect();
}
