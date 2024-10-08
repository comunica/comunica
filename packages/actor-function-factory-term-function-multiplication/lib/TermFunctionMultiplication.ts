import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';
import { BigNumber } from 'bignumber.js';

export class TermFunctionMultiplication extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.MULTIPLICATION,
      overloads: declare(SparqlOperator.MULTIPLICATION)
        .arithmetic(() => (left, right) => new BigNumber(left).times(right).toNumber())
        .collect(),
    });
  }
}
