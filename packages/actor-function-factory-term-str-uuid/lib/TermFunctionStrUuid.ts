import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
  uuidv4,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-struuid
 */
export class TermFunctionStrUuid extends TermFunctionBase {
  public constructor() {
    super({
      arity: 0,
      operator: SparqlOperator.STRUUID,
      overloads: declare(SparqlOperator.STRUUID)
        .set([], () => () => string(uuidv4()))
        .collect(),
    });
  }
}
