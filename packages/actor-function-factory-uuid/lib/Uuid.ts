import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  NamedNode,
} from '@comunica/expression-evaluator';
import * as uuid from 'uuid';

/**
 * https://www.w3.org/TR/sparql11-query/#func-uuid
 */
export class Uuid extends RegularFunction {
  protected arity = 0;
  public operator = RegularOperator.UUID;

  protected overloads = declare(RegularOperator.UUID)
    .set([], () => () => new NamedNode(`urn:uuid:${uuid.v4()}`))
    .collect();
}
