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
        // e.g. for `xs:string` they do consider "or a type derived from `xs:string`".
        .onNumeric1(() => (val: NumericLiteral) => {
          if (val.dataType === TypeURL.XSD_INTEGER) {
            // Return the canonical representation of an integer.
            return string(integer(val.typedValue).str());
          }
          if (val.dataType === TypeURL.XSD_DECIMAL) {
            // The canonical representation of a decimal already covers the canonical integer case,
            // by stripping away decimals when the number can be expressed as an integer.
            // Thus, we can simply return the canonical decimal representation.
            return string(decimal(val.typedValue).str());
          }
          if (val.dataType === TypeURL.XSD_DOUBLE || val.dataType === TypeURL.XSD_FLOAT) {
            // Exact zero should always be returned as "0", which differs from the
            // XSD datatype canonical representation of "0.0E0", and must therefore be handled separately.
            if (val.typedValue === 0) {
              return string('0');
            }
            // Decimal and float, where absolute value is in range `[0.000001, 1000000[`,
            // should be converted to decimal before casting to string, as per the spec.
            if (
              (val.typedValue > -1e6 && val.typedValue <= -1e-6) ||
              (val.typedValue >= 1e-6 && val.typedValue < 1e6)
            ) {
              return string(decimal(val.typedValue).str());
            }
            // The conditions laid out by XPath spec for double and float representation do not explicitly
            // state that the format is the canonical double/float representation from XSD type spec.
            // However, the conditions imposed by the XPath spec are identical with the XSD canonical format,
            // and we can therefore return the canonical representation of a double or float here.
            // Note that floats will fall through here, and be handled by the fallback statement
            // at the bottom of the function.
            if (val.dataType === TypeURL.XSD_DOUBLE) {
              return string(double(val.typedValue).str());
            }
          }
          // This line handles the actual float representation, when canonical float output is needed.
          // This also doubles as fallback for unhandled numeric types.
          return string(float(val.typedValue).str());
        })
        .onBoolean1Typed(() => val => string(bool(val).str()))
        .onTerm1(() => (val: StringLiteral) => string(val.str()))
        .collect(),
    });
  }
}
