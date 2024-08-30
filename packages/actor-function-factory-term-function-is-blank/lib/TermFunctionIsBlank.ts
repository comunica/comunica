import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-isBlank
 */
export class TermFunctionIsBlank extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.IS_BLANK,
      overloads: declare(SparqlOperator.IS_BLANK)
        .onTerm1(() => term => bool(term.termType === 'blankNode'))
        .collect(),
    });
  }
}
