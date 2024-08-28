import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/expression-evaluator';

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#istriple
 */
export class TermFunctionIsTriple extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.IS_TRIPLE,
      overloads: declare(SparqlOperator.IS_TRIPLE)
        .onTerm1(() => term => bool(term.termType === 'quad'))
        .collect(),
    });
  }
}
