import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-abs
 */
export class TermFunctionAbs extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.ABS,
      overloads: declare(SparqlOperator.ABS)
        .numericConverter(() => num => Math.abs(num))
        .collect(),
    });
  }
}
