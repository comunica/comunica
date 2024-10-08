import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
} from '@comunica/utils-expression-evaluator';
import { sha256 } from 'hash.js';

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha256
 */
export class TermFunctionSha256 extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.SHA256,
      overloads: declare(SparqlOperator.SHA256)
        .onString1Typed(() => str => string(sha256().update(str).digest('hex')))
        .collect(),
    });
  }
}
