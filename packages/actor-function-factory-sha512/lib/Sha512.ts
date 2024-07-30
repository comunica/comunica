import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  string,
} from '@comunica/expression-evaluator';
import { sha512 } from 'hash.js';

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha512
 */
export class Sha512 extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SHA512;

  protected overloads = declare(RegularOperator.SHA512)
    .onString1Typed(() => str => string(sha512().update(str).digest('hex')))
    .collect();
}
