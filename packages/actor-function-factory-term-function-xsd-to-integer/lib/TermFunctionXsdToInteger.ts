import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  Term,
} from '@comunica/expression-evaluator';
import {
  CastError,
  declare,
  integer,
  parseXSDInteger,
  TypeURL,
} from '@comunica/expression-evaluator';

export class TermFunctionXsdToInteger extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_INTEGER,
      overloads: declare(TypeURL.XSD_INTEGER)
        .onBoolean1Typed(() => val => integer(val ? 1 : 0))
        .onNumeric1(() => (val: Term) => {
          const result = parseXSDInteger(val.str());
          if (result === undefined) {
            throw new CastError(val, TypeURL.XSD_INTEGER);
          }
          return integer(result);
        }, false)
        .onString1(() => (val: Term) => {
          const str = val.str();
          const result = /^\d+$/u.test(str) ? parseXSDInteger(str) : undefined;
          if (result === undefined) {
            throw new CastError(val, TypeURL.XSD_INTEGER);
          }
          return integer(result);
        })
        .collect(),
    });
  }
}
