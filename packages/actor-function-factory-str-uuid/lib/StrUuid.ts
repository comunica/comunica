import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  string,
} from '@comunica/expression-evaluator';
import * as uuid from 'uuid';

/**
 * https://www.w3.org/TR/sparql11-query/#func-struuid
 */
export class StrUuid extends RegularFunction {
  protected arity = 0;
  public operator = RegularOperator.STRUUID;

  protected overloads = declare(RegularOperator.STRUUID)
    .set([], () => () => string(uuid.v4()))
    .collect();
}
