import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  TypeURL,
  decimal,
  declare,
  ExpressionError,
} from '@comunica/expression-evaluator';
import { BigNumber } from 'bignumber.js';

export class Division extends RegularFunction {
  protected arity = 2;

  public operator = RegularOperator.DIVISION;

  protected overloads = declare(RegularOperator.DIVISION)
    .arithmetic(() => (left, right) => new BigNumber(left).div(right).toNumber())
    .onBinaryTyped(
      [ TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
      () => (left: number, right: number) => {
        if (right === 0) {
          throw new ExpressionError('Integer division by 0');
        }
        return decimal(new BigNumber(left).div(right).toNumber());
      },
    )
    .collect();
}
