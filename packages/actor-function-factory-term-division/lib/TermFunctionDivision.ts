import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  decimal,
  declare,
  ExpressionError,
  SparqlOperator,
  TypeURL,
} from '@comunica/utils-expression-evaluator';
import { BigNumber } from 'bignumber.js';

export class TermFunctionDivision extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.DIVISION,
      overloads: declare(SparqlOperator.DIVISION)
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
        .collect(),
    });
  }
}
