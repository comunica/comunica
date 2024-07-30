import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  bool,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-isBlank
 */
export class IsBlank extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IS_BLANK;

  protected overloads = declare(RegularOperator.IS_BLANK)
    .onTerm1(() => term => bool(term.termType === 'blankNode'))
    .collect();
}
