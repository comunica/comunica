import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#subject
 */
export class Subject extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SUBJECT;

  protected overloads = declare(RegularOperator.SUBJECT)
    .onQuad1(() => quad => quad.subject)
    .collect();
}
