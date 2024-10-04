import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-str
 */
export class TermFunctionStr extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.STR,
      overloads: declare(SparqlOperator.STR)
        .onTerm1(() => term => string(term.str()))
        .collect(),
    });
  }
}
