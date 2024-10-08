import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-isIRI
 */
export class TermFunctionIsIri extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.IS_IRI,
      overloads: declare(SparqlOperator.IS_IRI)
        .onTerm1(() => term => bool(term.termType === 'namedNode'))
        .collect(),
    });
  }
}
