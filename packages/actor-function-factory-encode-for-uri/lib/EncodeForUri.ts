import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  string,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-encode
 */
export class EncodeForUri extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.ENCODE_FOR_URI;

  protected overloads = declare(RegularOperator.ENCODE_FOR_URI)
    .onStringly1Typed(() => val => string(encodeURI(val))).collect();
}
