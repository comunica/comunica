import { TermFunctionBase } from '@comunica/bus-function-factory';
import {

  CastError,
  declare,
  integer,
  TypeURL,
} from '@comunica/expression-evaluator';
import type {
  NumericLiteral,
  Term,
} from '@comunica/expression-evaluator';

export class TermFunctionXsdToInteger extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_INTEGER,
      overloads: declare(TypeURL.XSD_INTEGER)
        .onBoolean1Typed(() => val => integer(val ? 1 : 0))
        .onNumeric1(() => (val: NumericLiteral) => {
          if (!Number.isFinite(val.typedValue)) {
            throw new CastError(val, TypeURL.XSD_INTEGER);
          }
          return integer(Math.trunc(val.typedValue));
        })
        .onString1(() => (val: Term) => {
          const str = val.str();
          const result = /^\d+$/u.test(str) ? Number.parseInt(str, 10) : undefined;
          if (result === undefined) {
            throw new CastError(val, TypeURL.XSD_INTEGER);
          }
          return integer(result);
        })
        .collect(),
    });
  }
}
