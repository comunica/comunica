import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  string,
} from '@comunica/expression-evaluator';
import { sha384 } from 'hash.js';

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha384
 */
export class Sha384 extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SHA384;

  protected overloads = declare(RegularOperator.SHA384)
    .onString1Typed(() => str => string(sha384().update(str).digest('hex')))
    .collect();
}
