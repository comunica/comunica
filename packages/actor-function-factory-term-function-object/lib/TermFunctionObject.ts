import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/expression-evaluator';

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#object
 */
export class TermFunctionObject extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.OBJECT,
      overloads: declare(SparqlOperator.OBJECT)
        .onQuad1(() => quad => quad.object)
        .collect(),
    });
  }
}
