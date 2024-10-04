import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-encode
 */
export class TermFunctionEncodeForUri extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.ENCODE_FOR_URI,
      overloads: declare(SparqlOperator.ENCODE_FOR_URI)
        .onStringly1Typed(() => val => string(encodeURI(val))).collect(),
    });
  }
}
