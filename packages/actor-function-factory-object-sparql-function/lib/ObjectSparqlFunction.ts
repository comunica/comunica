import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#object
 */
export class ObjectSparqlFunction extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.OBJECT;

  protected overloads = declare(RegularOperator.OBJECT)
    .onQuad1(() => quad => quad.object)
    .collect();
}
