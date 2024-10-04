import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#predicate
 */
export class TermFunctionPredicate extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.PREDICATE,
      overloads: declare(SparqlOperator.PREDICATE)
        .onQuad1(() => quad => quad.predicate)
        .collect(),
    });
  }
}
