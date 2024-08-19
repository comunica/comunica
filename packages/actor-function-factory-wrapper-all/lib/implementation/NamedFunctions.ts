import { TermSparqlFunction } from '@comunica/bus-function-factory';
import type {
  NamedOperator,
  NumericLiteral,

  StringLiteral,
  Term,
  TermExpression,
} from '@comunica/expression-evaluator';
import {
  DateLiteral,
  DateTimeLiteral,
  TimeLiteral,
  DurationLiteral,
  bool,
  dateTime,
  decimal,
  declare,
  double,
  float,
  integer,
  string,
  TypeURL,
  trimToDayTimeDuration,
  trimToYearMonthDuration,
  parseDate,
  parseDateTime,
  parseDayTimeDuration,
  parseDuration,
  parseTime,
  parseYearMonthDuration,
  parseXSDDecimal,
  parseXSDFloat,
  parseXSDInteger,
  CastError,
  DayTimeDurationLiteral,
  YearMonthDurationLiteral,
} from '@comunica/expression-evaluator';

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Begin definitions.

// ----------------------------------------------------------------------------
// XPath Constructor functions
// https://www.w3.org/TR/sparql11-query/#
// https://www.w3.org/TR/xpath-functions/#casting-from-primitive-to-primitive
// ----------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/xpath-functions/#casting-to-string
 */
class XsdToString extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_STRING;

  protected overloads = declare(TypeURL.XSD_STRING)
    .onNumeric1(() => (val: NumericLiteral) => string(float(val.typedValue).str()))
    .onBoolean1Typed(() => val => string(bool(val).str()))
    .onTerm1(() => (val: StringLiteral) => string(val.str()))
    .collect();
}

class XsdToFloat extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_FLOAT;

  protected overloads = declare(TypeURL.XSD_FLOAT)
    .onNumeric1(() => (val: NumericLiteral) => float(val.typedValue))
    .onBoolean1Typed(() => val => float(val ? 1 : 0))
    .onUnary(TypeURL.XSD_STRING, () => (val: StringLiteral) => {
      const result = parseXSDFloat(val.str());
      if (result === undefined) {
        throw new CastError(val, TypeURL.XSD_FLOAT);
      }
      return float(result);
    }, false)
    .collect();
}

class XsdToDouble extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_DOUBLE;

  protected overloads = declare(TypeURL.XSD_DOUBLE)
    .onNumeric1(() => (val: NumericLiteral) => double(val.typedValue))
    .onBoolean1Typed(() => val => double(val ? 1 : 0))
    .onUnary(TypeURL.XSD_STRING, () => (val: Term) => {
      const result = parseXSDFloat(val.str());
      if (result === undefined) {
        throw new CastError(val, TypeURL.XSD_DOUBLE);
      }
      return double(result);
    }, false)
    .collect();
}

class XsdToDecimal extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_DECIMAL;

  protected overloads = declare(TypeURL.XSD_DECIMAL)
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
    .collect();
}

class XsdToInteger extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_INTEGER;

  protected overloads = declare(TypeURL.XSD_INTEGER)
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
    .collect();
}

class XsdToDatetime extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_DATE_TIME;

  protected overloads = declare(TypeURL.XSD_DATE_TIME)
    .onUnary(TypeURL.XSD_DATE_TIME, () => (val: DateTimeLiteral) => val)
    .onUnary(TypeURL.XSD_STRING, () => (val: TermExpression) =>
      dateTime(parseDateTime(val.str()), val.str()), false)
    .onUnary(TypeURL.XSD_DATE, () => (val: DateLiteral) =>
      new DateTimeLiteral({ ...val.typedValue, hours: 0, minutes: 0, seconds: 0 }))
    .collect();
}

class XsdToBoolean extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_BOOLEAN;

  protected overloads = declare(TypeURL.XSD_BOOLEAN)
    .onNumeric1(() => (val: NumericLiteral) => bool(val.coerceEBV()), true)
    .onUnary(TypeURL.XSD_BOOLEAN, () => (val: TermExpression) => bool(val.coerceEBV()), true)
    .onUnary(TypeURL.XSD_STRING, () => (val: TermExpression) => {
      switch (val.str()) {
        case 'true':
          return bool(true);
        case 'false':
          return bool(false);
        case '1':
          return bool(true);
        case '0':
          return bool(false);
        default:
          throw new CastError(val, TypeURL.XSD_BOOLEAN);
      }
    }, false)
    .collect();
}

// End definitions.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

// Additional definitions to implement https://github.com/w3c/sparql-12/blob/main/SEP/SEP-0002/sep-0002.md
// The additional casts are listed in https://www.w3.org/TR/xpath-functions/#casting-from-primitive-to-primitive
class XsdToTime extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_TIME;

  protected overloads = declare(TypeURL.XSD_TIME)
    .onUnary(TypeURL.XSD_TIME, () => (val: TimeLiteral) => new TimeLiteral(val.typedValue, val.strValue))
    .onUnary(TypeURL.XSD_DATE_TIME, () => (val: DateTimeLiteral) =>
      new TimeLiteral(val.typedValue))
    .onStringly1(() => (val: TermExpression) => new TimeLiteral(parseTime(val.str())))
    .collect();
}

class XsdToDate extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_DATE;

  protected overloads = declare(TypeURL.XSD_DATE)
    .onUnary(TypeURL.XSD_DATE, () => (val: DateLiteral) => new DateLiteral(val.typedValue, val.strValue))
    .onUnary(TypeURL.XSD_DATE_TIME, () => (val: DateTimeLiteral) =>
      new DateLiteral(val.typedValue))
    .onStringly1(() => (val: Term) => new DateLiteral(parseDate(val.str())))
    .collect();
}

class XsdToDuration extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_DAY_TIME_DURATION;

  protected overloads = declare(TypeURL.XSD_DURATION)
    // https://www.w3.org/TR/xpath-functions/#casting-to-durations
    .onUnary(TypeURL.XSD_DURATION, () => (val: DurationLiteral) =>
      // Copy is needed to make sure the dataType is changed, even when the provided type was a subtype
      new DurationLiteral(val.typedValue, val.strValue))
    .onStringly1(() => (val: TermExpression) =>
      new DurationLiteral(parseDuration(val.str())))
    .collect();
}

class XsdToDayTimeDuration extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_DAY_TIME_DURATION;

  protected overloads = declare(TypeURL.XSD_DAY_TIME_DURATION)
    // https://www.w3.org/TR/xpath-functions/#casting-to-durations
    .onUnary(TypeURL.XSD_DURATION, () => (val: DurationLiteral) =>
      // Copy is needed to make sure the dataType is changed, even when the provided type was a subtype
      new DayTimeDurationLiteral(trimToDayTimeDuration(val.typedValue)))
    .onStringly1(() => (val: TermExpression) =>
      new DayTimeDurationLiteral(parseDayTimeDuration(val.str())))
    .collect();
}

class XsdToYearMonthDuration extends TermSparqlFunction {
  protected arity = 1;

  public operator: NamedOperator = TypeURL.XSD_YEAR_MONTH_DURATION;

  protected overloads = declare(TypeURL.XSD_YEAR_MONTH_DURATION)
    // https://www.w3.org/TR/xpath-functions/#casting-to-durations
    .onUnary(TypeURL.XSD_DURATION, () => (val: DurationLiteral) =>
      // Copy is needed to make sure the dataType is changed, even when the provided type was a subtype
      new YearMonthDurationLiteral(trimToYearMonthDuration(val.typedValue)))
    .onStringly1(() => (val: TermExpression) =>
      new YearMonthDurationLiteral(parseYearMonthDuration(val.str())))
    .collect();
}

export const namedFunctions: Record<NamedOperator, TermSparqlFunction> = {
  // --------------------------------------------------------------------------
  // XPath Constructor functions
  // https://www.w3.org/TR/sparql11-query/#FunctionMapping
  // --------------------------------------------------------------------------
  [TypeURL.XSD_STRING]: new XsdToString(),
  [TypeURL.XSD_FLOAT]: new XsdToFloat(),
  [TypeURL.XSD_DOUBLE]: new XsdToDouble(),
  [TypeURL.XSD_DECIMAL]: new XsdToDecimal(),
  [TypeURL.XSD_INTEGER]: new XsdToInteger(),
  [TypeURL.XSD_DATE_TIME]: new XsdToDatetime(),
  [TypeURL.XSD_DATE]: new XsdToDate(),
  [TypeURL.XSD_BOOLEAN]: new XsdToBoolean(),
  [TypeURL.XSD_TIME]: new XsdToTime(),
  [TypeURL.XSD_DURATION]: new XsdToDuration(),
  [TypeURL.XSD_DAY_TIME_DURATION]: new XsdToDayTimeDuration(),
  [TypeURL.XSD_YEAR_MONTH_DURATION]: new XsdToYearMonthDuration(),
};
