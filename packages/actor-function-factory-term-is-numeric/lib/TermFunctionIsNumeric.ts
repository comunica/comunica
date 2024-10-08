import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-isNumeric
 */
export class TermFunctionIsNumeric extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.IS_NUMERIC,
      overloads: declare(SparqlOperator.IS_NUMERIC)
        .onNumeric1(() => () => bool(true))
        .onTerm1(() => () => bool(false))
        .collect(),
    });
  }
}
