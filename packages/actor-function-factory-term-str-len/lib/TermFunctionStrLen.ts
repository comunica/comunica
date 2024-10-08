import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  integer,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strlen
 */
export class TermFunctionStrLen extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.STRLEN,
      overloads: declare(SparqlOperator.STRLEN)
        .onStringly1(() => str => integer([ ...str.typedValue ].length))
        .collect(),
    });
  }
}
