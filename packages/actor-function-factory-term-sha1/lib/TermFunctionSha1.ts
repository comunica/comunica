import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
} from '@comunica/utils-expression-evaluator';
import { sha1 } from 'hash.js';

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha1
 */
export class TermFunctionSha1 extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.SHA1,
      overloads: declare(SparqlOperator.SHA1)
        .onString1Typed(() => str => string(sha1().update(str).digest('hex')))
        .collect(),
    });
  }
}
