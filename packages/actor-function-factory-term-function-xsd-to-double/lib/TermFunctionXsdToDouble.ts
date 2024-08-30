import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  NumericLiteral,
  Term,
} from '@comunica/expression-evaluator';
import {
  CastError,
  declare,
  double,
  parseXSDFloat,
  TypeURL,
} from '@comunica/expression-evaluator';

export class TermFunctionXsdToDouble extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_DOUBLE,
      overloads: declare(TypeURL.XSD_DOUBLE)
        .onNumeric1(() => (val: NumericLiteral) => double(val.typedValue))
        .onBoolean1Typed(() => val => double(val ? 1 : 0))
        .onUnary(TypeURL.XSD_STRING, () => (val: Term) => {
          const result = parseXSDFloat(val.str());
          if (result === undefined) {
            throw new CastError(val, TypeURL.XSD_DOUBLE);
          }
          return double(result);
        }, false)
        .collect(),
    });
  }
}
