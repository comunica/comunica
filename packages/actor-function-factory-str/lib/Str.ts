import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  string,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-str
 */
export class Str extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.STR;
  protected overloads = declare(RegularOperator.STR)
    .onTerm1(() => term => string(term.str()))
    .collect();
}
