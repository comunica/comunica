import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  string,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-lang
 */
export class Lang extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.LANG;

  protected overloads = declare(RegularOperator.LANG)
    .onLiteral1(() => lit => string(lit.language ?? ''))
    .collect();
}
