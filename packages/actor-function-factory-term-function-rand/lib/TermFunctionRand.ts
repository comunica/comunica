import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  double,
  SparqlOperator,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#idp2130040
 */
export class TermFunctionRand extends TermFunctionBase {
  public constructor() {
    super({
      arity: 0,
      operator: SparqlOperator.RAND,
      overloads: declare(SparqlOperator.RAND)
        .set([], () => () => double(Math.random()))
        .collect(),
    });
  }
}
