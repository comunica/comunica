import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#OperatorMapping
 */
export class TermFunctionUnaryPlus extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.UPLUS,
      overloads: declare(SparqlOperator.UPLUS)
        .numericConverter(() => val => val)
        .collect(),
    });
  }
}
