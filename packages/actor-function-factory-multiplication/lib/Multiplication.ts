import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
} from '@comunica/expression-evaluator';
import { BigNumber } from 'bignumber.js';

export class Multiplication extends RegularFunction {
  protected arity = 2;

  public operator = RegularOperator.MULTIPLICATION;

  protected overloads = declare(RegularOperator.MULTIPLICATION)
    .arithmetic(() => (left, right) => new BigNumber(left).times(right).toNumber())
    .collect();
}
