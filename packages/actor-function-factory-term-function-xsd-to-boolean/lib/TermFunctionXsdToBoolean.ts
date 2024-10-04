import { TermFunctionBase } from '@comunica/bus-function-factory';
import type { TermExpression } from '@comunica/types';
import type {
  NumericLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  CastError,
  declare,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

export class TermFunctionXsdToBoolean extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_BOOLEAN,
      overloads: declare(TypeURL.XSD_BOOLEAN)
        .onNumeric1(() => (val: NumericLiteral) => bool(val.coerceEBV()), true)
        .onUnary(TypeURL.XSD_BOOLEAN, () => (val: TermExpression) => bool(val.coerceEBV()), true)
        .onUnary(TypeURL.XSD_STRING, () => (val: TermExpression) => {
          switch (val.str()) {
            case 'true':
              return bool(true);
            case 'false':
              return bool(false);
            case '1':
              return bool(true);
            case '0':
              return bool(false);
            default:
              throw new CastError(val, TypeURL.XSD_BOOLEAN);
          }
        }, false)
        .collect(),
    });
  }
}
