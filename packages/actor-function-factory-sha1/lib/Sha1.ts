import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  string,
} from '@comunica/expression-evaluator';
import { sha1 } from 'hash.js';

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha1
 */
export class Sha1 extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SHA1;

  protected overloads = declare(RegularOperator.SHA1)
    .onString1Typed(() => str => string(sha1().update(str).digest('hex')))
    .collect();
}
