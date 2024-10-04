import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  NumericLiteral,
  StringLiteral,
} from '@comunica/expression-evaluator';
import {
  CastError,
  declare,
  float,
  parseXSDFloat,
  TypeURL,
} from '@comunica/expression-evaluator';

export class TermFunctionXsdToFloat extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_FLOAT,
      overloads: declare(TypeURL.XSD_FLOAT)
        .onNumeric1(() => (val: NumericLiteral) => float(val.typedValue))
        .onBoolean1Typed(() => val => float(val ? 1 : 0))
        .onUnary(TypeURL.XSD_STRING, () => (val: StringLiteral) => {
          const result = parseXSDFloat(val.str());
          if (result === undefined) {
            throw new CastError(val, TypeURL.XSD_FLOAT);
          }
          return float(result);
        }, false)
        .collect(),
    });
  }
}
