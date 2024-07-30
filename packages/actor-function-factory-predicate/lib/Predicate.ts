import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#predicate
 */
export class Predicate extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.PREDICATE;

  protected overloads = declare(RegularOperator.PREDICATE)
    .onQuad1(() => quad => quad.predicate)
    .collect();
}
