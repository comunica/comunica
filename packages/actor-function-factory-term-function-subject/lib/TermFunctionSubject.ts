import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/expression-evaluator';

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#subject
 */
export class TermFunctionSubject extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.SUBJECT,
      overloads: declare(SparqlOperator.SUBJECT)
        .onQuad1(() => quad => quad.subject)
        .collect(),
    });
  }
}
