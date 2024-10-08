import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-floor
 */
export class TermFunctionFloor extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.FLOOR,
      overloads: declare(SparqlOperator.FLOOR)
        .numericConverter(() => num => Math.floor(num))
        .collect(),
    });
  }
}
