import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  string,
} from '@comunica/expression-evaluator';
import { hash as md5 } from 'spark-md5';

/**
 * https://www.w3.org/TR/sparql11-query/#func-md5
 */
export class Md5 extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.MD5;

  protected overloads = declare(RegularOperator.MD5)
    .onString1Typed(() => str => string(md5(str)))
    .collect();
}
