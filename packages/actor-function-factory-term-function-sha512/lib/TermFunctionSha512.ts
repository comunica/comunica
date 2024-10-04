import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
} from '@comunica/expression-evaluator';
import { sha512 } from 'hash.js';

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha512
 */
export class TermFunctionSha512 extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.SHA512,
      overloads: declare(SparqlOperator.SHA512)
        .onString1Typed(() => str => string(sha512().update(str).digest('hex')))
        .collect(),
    });
  }
}
