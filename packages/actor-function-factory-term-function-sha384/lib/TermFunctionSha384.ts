import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
} from '@comunica/expression-evaluator';
import { sha384 } from 'hash.js';

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha384
 */
export class TermFunctionSha384 extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.SHA384,
      overloads: declare(SparqlOperator.SHA384)
        .onString1Typed(() => str => string(sha384().update(str).digest('hex')))
        .collect(),
    });
  }
}
