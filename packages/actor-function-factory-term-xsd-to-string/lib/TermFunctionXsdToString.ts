import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  NumericLiteral,
  StringLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  decimal,
  declare,
  double,
  float,
  integer,
  string,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * Implementation of `xsd:string`, following the XPath specification:
 * https://www.w3.org/TR/xpath-functions/#casting-to-string
 */
export class TermFunctionXsdToString extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_STRING,
      overloads: declare(TypeURL.XSD_STRING)
        // We need to go through .onNumeric1 since the spec does NOT talk about type derivations
        // SPECIFICALLY when checking the types in the numeric check,
        // e.g. for `xs:string` they do consider "or a type derived from `xs:string`"
        .onNumeric1(() => (val: NumericLiteral) => {
          if (val.dataType === TypeURL.XSD_INTEGER) {
            return string(integer(val.typedValue).str());
          }
          if (val.dataType === TypeURL.XSD_DECIMAL) {
            return string(decimal(val.typedValue).str());
          }
          if (val.dataType === TypeURL.XSD_DOUBLE || val.dataType === TypeURL.XSD_FLOAT) {
            // Exact zero should always be returned as "0" which differs from the
            // XSD datatype canonical representation
            if (val.typedValue === 0) {
              return string('0');
            }
            // Decimal and float where absolute value is in range [0.000001, 1000000[
            // should be converted to decimal before casting to string
            if (
              (val.typedValue > -1e6 && val.typedValue <= -1e-6) ||
              (val.typedValue >= 1e-6 && val.typedValue < 1e6)
            ) {
              return string(decimal(val.typedValue).str());
            }
            if (val.dataType === TypeURL.XSD_DOUBLE) {
              return string(double(val.typedValue).str());
            }
          }
          // The original code used float for everything,
          // so keeping float as fallback makes sense.
          return string(float(val.typedValue).str());
        })
        .onBoolean1Typed(() => val => string(bool(val).str()))
        .onTerm1(() => (val: StringLiteral) => string(val.str()))
        .collect(),
    });
  }
}
