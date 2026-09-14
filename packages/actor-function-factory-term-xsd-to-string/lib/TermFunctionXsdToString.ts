import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  NumericLiteral,
  DecimalLiteral,
  FloatLiteral,
  IntegerLiteral,
  StringLiteral,
  DoubleLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  decimal,
  declare,
  double,
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
        // The numeric types (xsd:decimal, xsd:double, xsd:float), as well as xsd:integer,
        // are handled individually, covering all cases of .onNumeric1, based on `extensionTableInput`.
        // Specification treats floats the same as doubles, and thy share formatter code, as well.
        .set<DecimalLiteral>([ TypeURL.XSD_DECIMAL ], () => ([ val ]) => TermFunctionXsdToString.castAsDecimal(val))
        .set<IntegerLiteral>([ TypeURL.XSD_INTEGER ], () => ([ val ]) => TermFunctionXsdToString.castAsInteger(val))
        .set<DoubleLiteral>([ TypeURL.XSD_DOUBLE ], () => ([ val ]) => TermFunctionXsdToString.castAsDouble(val))
        .set<FloatLiteral>([ TypeURL.XSD_FLOAT ], () => ([ val ]) => TermFunctionXsdToString.castAsDouble(val))
        .onBoolean1Typed(() => val => string(bool(val).str()))
        .onTerm1(() => (val: StringLiteral) => string(val.str()))
        .collect(),
    });
  }

  private static castAsInteger(val: NumericLiteral): StringLiteral {
    return string(integer(val.typedValue).str());
  }

  private static castAsDecimal(val: NumericLiteral): StringLiteral {
    // Specification requires integer-valued decimals to be cast as integers.
    return Number.isInteger(val.typedValue) ?
      TermFunctionXsdToString.castAsInteger(val) :
      string(decimal(val.typedValue).str());
  }

  private static castAsDouble(val: NumericLiteral): StringLiteral {
    // Specification requires exact 0 to be returned as "0" which differs from canonical "0.0E0"
    if (val.typedValue === 0) {
      return string('0');
    }

    // Decimal and float, where absolute value is in range `[0.000001, 1000000[`,
    // should be converted to decimal before casting to string, as per the spec.
    if (
      (val.typedValue > -1e6 && val.typedValue <= -1e-6) ||
      (val.typedValue >= 1e-6 && val.typedValue < 1e6)
    ) {
      return TermFunctionXsdToString.castAsDecimal(val);
    }

    // Other cases should be handled as canonical doubles.
    // This also includes the handling of NaN and infinity.
    return string(double(val.typedValue).str());
  }
}
