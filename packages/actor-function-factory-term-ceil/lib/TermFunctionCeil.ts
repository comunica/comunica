import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-ceil
 */
export class TermFunctionCeil extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.CEIL,
      overloads: declare(SparqlOperator.CEIL)
        .numericConverter(() => num => Math.ceil(num))
        .collect(),
    });
  }
}
