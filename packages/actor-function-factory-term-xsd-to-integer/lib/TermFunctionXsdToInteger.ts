import { TermFunctionBase } from '@comunica/bus-function-factory';
import {

  CastError,
  declare,
  integer,
  TypeURL,
} from '@comunica/utils-expression-evaluator';
import type {
  NumericLiteral,
  Term,
} from '@comunica/utils-expression-evaluator';

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
          // The xsd:integer lexical form, with surrounding whitespace collapsed
          const match = /^[\t\n\r ]*([+-]?\d+)[\t\n\r ]*$/u.exec(val.str());
          if (!match) {
            throw new CastError(val, TypeURL.XSD_INTEGER);
          }
          return integer(Number.parseInt(match[1], 10));
        })
        .collect(),
    });
  }
}
