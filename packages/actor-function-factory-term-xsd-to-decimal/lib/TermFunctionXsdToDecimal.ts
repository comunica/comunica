import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  Term,
} from '@comunica/utils-expression-evaluator';
import {
  CastError,
  decimal,
  declare,
  parseXSDDecimal,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

export class TermFunctionXsdToDecimal extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_DECIMAL,
      overloads: declare(TypeURL.XSD_DECIMAL)
        .onNumeric1(() => (val: Term) => {
          const result = parseXSDDecimal(val.str());
          if (result === undefined) {
            throw new CastError(val, TypeURL.XSD_DECIMAL);
          }
          return decimal(result);
        })
        .onString1(() => (val: Term) => {
          const str = val.str();
          const result = /^([+-])?(\d+(\.\d+)?)$/u.test(str) ? parseXSDDecimal(str) : undefined;
          if (result === undefined) {
            throw new CastError(val, TypeURL.XSD_DECIMAL);
          }
          return decimal(result);
        }, false)
        .onBoolean1Typed(() => val => decimal(val ? 1 : 0))
        .collect(),
    });
  }
}
