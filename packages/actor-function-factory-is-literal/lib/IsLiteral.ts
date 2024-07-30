import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  bool,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-isLiteral
 */
export class IsLiteral extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IS_LITERAL;
  protected overloads = declare(RegularOperator.IS_LITERAL)
    .onTerm1(() => term => bool(term.termType === 'literal'))
    .collect();
}
