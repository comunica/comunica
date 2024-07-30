import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  string,
} from '@comunica/expression-evaluator';
import { sha256 } from 'hash.js';

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha256
 */
export class Sha256 extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SHA256;

  protected overloads = declare(RegularOperator.SHA256)
    .onString1Typed(() => str => string(sha256().update(str).digest('hex')))
    .collect();
}
