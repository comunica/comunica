import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-round
 */
export class TermFunctionRound extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.ROUND,
      overloads: declare(SparqlOperator.ROUND)
        .numericConverter(() => num => Math.round(num))
        .collect(),
    });
  }
}
