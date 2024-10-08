import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  NumericLiteral,
  StringLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  declare,
  float,
  string,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/xpath-functions/#casting-to-string
 */
export class TermFunctionXsdToString extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_STRING,
      overloads: declare(TypeURL.XSD_STRING)
        .onNumeric1(() => (val: NumericLiteral) => string(float(val.typedValue).str()))
        .onBoolean1Typed(() => val => string(bool(val).str()))
        .onTerm1(() => (val: StringLiteral) => string(val.str()))
        .collect(),
    });
  }
}
