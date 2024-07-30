import { RegularFunction } from '@comunica/bus-function-factory/lib/implementation/Core';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';

import type {
  IInternalEvaluator,
  DurationLiteral,
  Term,
  YearMonthDurationLiteral,
  NumericLiteral,
  BooleanLiteral,
  StringLiteral,
} from '@comunica/expression-evaluator';
import {
  RegularOperator,
  TypeAlias,
  TypeURL,
  bool,
  decimal,
  declare,
  double,
  integer,
  langString,
  string,
  dayTimeDurationsToSeconds,
  defaultedDateTimeRepresentation,
  defaultedDayTimeDurationRepresentation,
  defaultedDurationRepresentation,
  defaultedYearMonthDurationRepresentation,
  extractRawTimeZone,
  negateDuration,
  toDateTimeRepresentation,
  toUTCDate,
  yearMonthDurationsToMonths,
  ExpressionError,
  RDFEqualTypeError,
  IncompatibleLanguageOperation,
  InvalidTimezoneCall,
  DateTimeLiteral,
  DayTimeDurationLiteral,
  DateLiteral,
  TimeLiteral,
  LangStringLiteral,
  Quad,
  NamedNode,
  DefaultGraph,
  TermTransformer,
  addDurationToDateTime,
  elapsedDuration,
} from '@comunica/expression-evaluator';
import type { IDayTimeDurationRepresentation } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { BigNumber } from 'bignumber.js';
import { sha1, sha256, sha384, sha512 } from 'hash.js';
import { DataFactory } from 'rdf-data-factory';
import { resolve as resolveRelativeIri } from 'relative-to-absolute-iri';
import { hash as md5 } from 'spark-md5';
import * as uuid from 'uuid';

const DF = new DataFactory<RDF.BaseQuad>();

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Begin definitions

// ----------------------------------------------------------------------------
// Operator Mapping
// https://www.w3.org/TR/sparql11-query/#OperatorMapping
// ----------------------------------------------------------------------------

class Not extends RegularFunction {
  protected arity = 1;

  public operator = RegularOperator.NOT;

  protected overloads = declare(RegularOperator.NOT)
    .onTerm1(() => val => bool(!val.coerceEBV()))
    .collect();
}

class UnaryPlus extends RegularFunction {
  protected arity = 1;

  public operator = RegularOperator.UPLUS;

  protected overloads = declare(RegularOperator.UPLUS)
    .numericConverter(() => val => val)
    .collect();
}

class UnaryMinus extends RegularFunction {
  protected arity = 1;

  public operator = RegularOperator.UMINUS;

  protected overloads = declare(RegularOperator.UMINUS)
    .numericConverter(() => val => -val)
    .collect();
}

class Multiplication extends RegularFunction {
  protected arity = 2;

  public operator = RegularOperator.MULTIPLICATION;

  protected overloads = declare(RegularOperator.MULTIPLICATION)
    .arithmetic(() => (left, right) => new BigNumber(left).times(right).toNumber())
    .collect();
}

class Division extends RegularFunction {
  protected arity = 2;

  public operator = RegularOperator.DIVISION;

  protected overloads = declare(RegularOperator.DIVISION)
    .arithmetic(() => (left, right) => new BigNumber(left).div(right).toNumber())
    .onBinaryTyped(
      [ TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
      () => (left: number, right: number) => {
        if (right === 0) {
          throw new ExpressionError('Integer division by 0');
        }
        return decimal(new BigNumber(left).div(right).toNumber());
      },
    )
    .collect();
}

class Addition extends RegularFunction {
  protected arity = 2;

  public operator = RegularOperator.ADDITION;

  protected overloads = declare(RegularOperator.ADDITION)
    .arithmetic(() => (left, right) => new BigNumber(left).plus(right).toNumber())
    .set([ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ date, dur ]: [ DateTimeLiteral, DayTimeDurationLiteral ]) =>
        // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-dateTime
        new DateTimeLiteral(addDurationToDateTime(date.typedValue, defaultedDurationRepresentation(dur.typedValue))))
    .copy({
      from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ],
      to: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_YEAR_MONTH_DURATION ],
    })
    .set([ TypeURL.XSD_DATE, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ date, dur ]: [DateLiteral, DurationLiteral]) =>
        // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-date
        new DateLiteral(
          addDurationToDateTime(
            defaultedDateTimeRepresentation(date.typedValue),
            defaultedDurationRepresentation(dur.typedValue),
          ),
        ))
    .copy({
      from: [ TypeURL.XSD_DATE, TypeURL.XSD_DAY_TIME_DURATION ],
      to: [ TypeURL.XSD_DATE, TypeURL.XSD_YEAR_MONTH_DURATION ],
    })
    .set([ TypeURL.XSD_TIME, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ time, dur ]: [TimeLiteral, DurationLiteral]) =>
        // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-time
        new TimeLiteral(
          addDurationToDateTime(
            defaultedDateTimeRepresentation(time.typedValue),
            defaultedDurationRepresentation(dur.typedValue),
          ),
        ))
    .copy({
      from: [ TypeURL.XSD_TIME, TypeURL.XSD_DAY_TIME_DURATION ],
      to: [ TypeURL.XSD_TIME, TypeURL.XSD_YEAR_MONTH_DURATION ],
    })
    .collect();
}

class Subtraction extends RegularFunction {
  protected arity = 2;

  public operator = RegularOperator.SUBTRACTION;

  protected overloads = declare(RegularOperator.SUBTRACTION)
    .arithmetic(() => (left, right) => new BigNumber(left).minus(right).toNumber())
    .set([ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ], exprEval =>
      ([ date1, date2 ]: [ DateTimeLiteral, DateTimeLiteral ]) =>
        // https://www.w3.org/TR/xpath-functions/#func-subtract-dateTimes;
        new DayTimeDurationLiteral(elapsedDuration(
          date1.typedValue,
          date2.typedValue,
          exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
        )))
    .copy({ from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_DATE, TypeURL.XSD_DATE ]})
    .copy({ from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_TIME, TypeURL.XSD_TIME ]})
    .set([ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ date, dur ]: [ DateTimeLiteral, DayTimeDurationLiteral ]) =>
        // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-dateTime
        new DateTimeLiteral(addDurationToDateTime(
          date.typedValue,
          defaultedDurationRepresentation(negateDuration(dur.typedValue)),
        )))
    .copy({
      from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ],
      to: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_YEAR_MONTH_DURATION ],
    })
    .set([ TypeURL.XSD_DATE, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ date, dur ]: [ DateLiteral, DayTimeDurationLiteral ]) =>
        // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-date
        new DateLiteral(addDurationToDateTime(
          defaultedDateTimeRepresentation(date.typedValue),
          defaultedDurationRepresentation(negateDuration(dur.typedValue)),
        )))
    .copy({
      from: [ TypeURL.XSD_DATE, TypeURL.XSD_DAY_TIME_DURATION ],
      to: [ TypeURL.XSD_DATE, TypeURL.XSD_YEAR_MONTH_DURATION ],
    })
    .set([ TypeURL.XSD_TIME, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ time, dur ]: [ TimeLiteral, DayTimeDurationLiteral ]) =>
        // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-date
        new TimeLiteral(addDurationToDateTime(
          defaultedDateTimeRepresentation(time.typedValue),
          defaultedDurationRepresentation(negateDuration(dur.typedValue)),
        )))
    .collect();
}

// https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
class Equality extends RegularFunction {
  protected arity = 2;

  public operator = RegularOperator.EQUAL;

  protected overloads = declare(RegularOperator.EQUAL)
    .numberTest(() => (left, right) => left === right)
    .stringTest(() => (left, right) => left.localeCompare(right) === 0)
    .set(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => ([ left, right ]: LangStringLiteral[]) => bool(left.str() === right.str() &&
        left.language === right.language),
    )
    // Fall through: a TypeURL.XSD_STRING is never equal to a TypeURL.RDF_LANG_STRING.
    .set([ TypeAlias.SPARQL_STRINGLY, TypeAlias.SPARQL_STRINGLY ], () => () => bool(false))
    .booleanTest(() => (left, right) => left === right)
    .dateTimeTest(exprEval => (left, right) =>
      toUTCDate(
        left,
        exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
      ).getTime() === toUTCDate(right, exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone)).getTime())
    .copy({
      // https://www.w3.org/TR/xpath-functions/#func-date-equal
      from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ],
      to: [ TypeURL.XSD_DATE, TypeURL.XSD_DATE ],
    })
    .set(
      [ 'quad', 'quad' ],
      exprEval => ([ left, right ]) =>
        bool(
          (<BooleanLiteral> this.applyOnTerms([ (<Quad> left).subject, (<Quad> right).subject ], exprEval))
            .coerceEBV() &&
          (<BooleanLiteral> this.applyOnTerms([ (<Quad> left).predicate, (<Quad> right).predicate ], exprEval))
            .coerceEBV() &&
          (<BooleanLiteral> this.applyOnTerms([ (<Quad> left).object, (<Quad> right).object ], exprEval))
            .coerceEBV() &&
          (<BooleanLiteral> this.applyOnTerms([ (<Quad> left).graph, (<Quad> right).graph ], exprEval))
            .coerceEBV(),
        )
      ,
      false,
    )
    .set(
      [ 'term', 'term' ],
      () => ([ _left, _right ]) => {
        const left = _left.toRDF();
        const right = _right.toRDF();
        const val = left.equals(right);
        if (!val && (left.termType === 'Literal') && (right.termType === 'Literal')) {
          throw new RDFEqualTypeError([ _left, _right ]);
        }
        return bool(val);
      },
      false,
    )
    .set([ TypeURL.XSD_DURATION, TypeURL.XSD_DURATION ], () =>
      ([ dur1, dur2 ]: [ DurationLiteral, DurationLiteral ]) =>
        bool(yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur1.typedValue)) ===
          yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur2.typedValue)) &&
          dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur1.typedValue)) ===
          dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur2.typedValue))))
    .set([ TypeURL.XSD_TIME, TypeURL.XSD_TIME ], exprEval =>
      ([ time1, time2 ]: [TimeLiteral, TimeLiteral]) =>
        // https://www.w3.org/TR/xpath-functions/#func-time-equal
        bool(
          toUTCDate(
            defaultedDateTimeRepresentation(time1.typedValue),
            exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
          ).getTime() ===
          toUTCDate(
            defaultedDateTimeRepresentation(time2.typedValue),
            exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
          ).getTime(),
        ))
    .collect();
}

class Inequality extends RegularFunction {
  protected arity = 2;

  public operator = RegularOperator.NOT_EQUAL;

  protected overloads = declare(RegularOperator.NOT_EQUAL)
    .set([ 'term', 'term' ], expressionEvaluator =>
      ([ first, second ]) =>
        bool(!(<BooleanLiteral> regularFunctions[RegularOperator.EQUAL]
          .applyOnTerms([ first, second ], expressionEvaluator)).typedValue))
    .collect();
}

class LesserThan extends RegularFunction {
  // TODO: when all is done, this should be injected in some way!
  public constructor(private readonly equalityFunction: RegularFunction) {
    super();
  }

  protected arity = 2;

  public operator = RegularOperator.LT;

  private quadComponentTest(left: Term, right: Term, exprEval: IInternalEvaluator): boolean | undefined {
    // If components are equal, we don't have an answer
    const componentEqual = this.equalityFunction.applyOnTerms(
      [ left, right ],
      exprEval,
    );
    if ((<BooleanLiteral> componentEqual).typedValue) {
      return undefined;
    }

    const componentLess = this.applyOnTerms(
      [ left, right ],
      exprEval,
    );
    return (<BooleanLiteral>componentLess).typedValue;
  }

  protected overloads = declare(RegularOperator.LT)
    .numberTest(() => (left, right) => left < right)
    .stringTest(() => (left, right) => left.localeCompare(right) === -1)
    .booleanTest(() => (left, right) => left < right)
    .dateTimeTest(exprEval => (left, right) =>
      toUTCDate(left, exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone)).getTime() <
      toUTCDate(right, exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone)).getTime())
    .copy({
      // https://www.w3.org/TR/xpath-functions/#func-date-less-than
      from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ],
      to: [ TypeURL.XSD_DATE, TypeURL.XSD_DATE ],
    })
    .set([ TypeURL.XSD_YEAR_MONTH_DURATION, TypeURL.XSD_YEAR_MONTH_DURATION ], () =>
      ([ dur1L, dur2L ]: [YearMonthDurationLiteral, YearMonthDurationLiteral]) =>
        // https://www.w3.org/TR/xpath-functions/#func-yearMonthDuration-less-than
        bool(yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur1L.typedValue)) <
          yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur2L.typedValue))))
    .set([ TypeURL.XSD_DAY_TIME_DURATION, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ dur1, dur2 ]: [DayTimeDurationLiteral, DayTimeDurationLiteral]) =>
        // https://www.w3.org/TR/xpath-functions/#func-dayTimeDuration-greater-than
        bool(dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur1.typedValue)) <
          dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur2.typedValue))))
    .set([ TypeURL.XSD_TIME, TypeURL.XSD_TIME ], exprEval =>
      ([ time1, time2 ]: [TimeLiteral, TimeLiteral]) =>
        // https://www.w3.org/TR/xpath-functions/#func-time-less-than
        bool(
          toUTCDate(
            defaultedDateTimeRepresentation(time1.typedValue),
            exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
          ).getTime() <
          toUTCDate(
            defaultedDateTimeRepresentation(time2.typedValue),
            exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
          ).getTime(),
        ))
    .set(
      [ 'quad', 'quad' ],
      exprEval => ([ left, right ]: [Quad, Quad]) => {
        const subjectTest = this.quadComponentTest(left.subject, right.subject, exprEval);
        if (subjectTest !== undefined) {
          return bool(subjectTest);
        }
        const predicateTest = this.quadComponentTest(left.predicate, right.predicate, exprEval);
        if (predicateTest !== undefined) {
          return bool(predicateTest);
        }
        const objectTest = this.quadComponentTest(left.object, right.object, exprEval);
        if (objectTest !== undefined) {
          return bool(objectTest);
        }
        return bool(this.quadComponentTest(left.graph, right.graph, exprEval) ?? false);
      },
      false,
    )
    .collect();
}

class GreaterThan extends RegularFunction {
  protected arity = 2;

  public operator = RegularOperator.GT;

  protected overloads = declare(RegularOperator.GT)
    .set([ 'term', 'term' ], expressionEvaluator =>
      ([ first, second ]) =>
        // X < Y -> Y > X
        regularFunctions[RegularOperator.LT].applyOnTerms([ second, first ], expressionEvaluator))
    .collect();
}

class LesserThanEqual extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.LTE;
  protected overloads = declare(RegularOperator.LTE)
    .set([ 'term', 'term' ], exprEval =>
      ([ first, second ]) =>
        // X <= Y -> X < Y || X = Y
        // First check if the first is lesser than the second, then check if they are equal.
        // Doing this, the correct error will be thrown, each type that has a lesserThanEqual has a matching lesserThan.
        bool(
          (<BooleanLiteral> regularFunctions[RegularOperator.LT].applyOnTerms([ first, second ], exprEval))
            .typedValue ||
          (<BooleanLiteral> regularFunctions[RegularOperator.EQUAL].applyOnTerms([ first, second ], exprEval))
            .typedValue,
        ))
    .collect();
}

class GreaterThanEqual extends RegularFunction {
  protected arity = 2;

  public operator = RegularOperator.GTE;
  protected overloads = declare(RegularOperator.GTE)
    .set([ 'term', 'term' ], exprEval =>
      ([ first, second ]) =>
        // X >= Y -> Y <= X
        regularFunctions[RegularOperator.LTE].applyOnTerms([ second, first ], exprEval))
    .collect();
}

// ----------------------------------------------------------------------------
// Functions on RDF Terms
// https://www.w3.org/TR/sparql11-query/#func-rdfTerms
// ----------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-isIRI
 */
class IsIri extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IS_IRI;
  protected overloads = declare(RegularOperator.IS_IRI)
    .onTerm1(() => term => bool(term.termType === 'namedNode'))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-isBlank
 */
class IsBlank extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IS_BLANK;

  protected overloads = declare(RegularOperator.IS_BLANK)
    .onTerm1(() => term => bool(term.termType === 'blankNode'))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-isLiteral
 */
class IsLiteral extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IS_LITERAL;
  protected overloads = declare(RegularOperator.IS_LITERAL)
    .onTerm1(() => term => bool(term.termType === 'literal'))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-isNumeric
 */
class IsNumeric extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IS_NUMERIC;

  protected overloads = declare(RegularOperator.IS_NUMERIC)
    .onNumeric1(() => () => bool(true))
    .onTerm1(() => () => bool(false))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-str
 */
class Str extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.STR;
  protected overloads = declare(RegularOperator.STR)
    .onTerm1(() => term => string(term.str()))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-lang
 */
class Lang extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.LANG;

  protected overloads = declare(RegularOperator.LANG)
    .onLiteral1(() => lit => string(lit.language ?? ''))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-datatype
 */
class Datatype extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.DATATYPE;

  protected overloads = declare(RegularOperator.DATATYPE)
    .onLiteral1(() => lit => new NamedNode(lit.dataType))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-iri
 */
class Iri extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IRI;

  protected overloads = declare(RegularOperator.IRI)
    .set([ 'namedNode' ], exprEval => (args) => {
      const lit = <NamedNode> args[0];
      const iri = resolveRelativeIri(lit.str(), exprEval.context.get(KeysInitQuery.baseIRI) ?? '');
      return new NamedNode(iri);
    })
    .onString1(exprEval => (lit) => {
      const iri = resolveRelativeIri(lit.str(), exprEval.context.get(KeysInitQuery.baseIRI) ?? '');
      return new NamedNode(iri);
    })
    .collect();
}

// See special functions
// class BNODE extends RegularFunction {};

/**
 * https://www.w3.org/TR/sparql11-query/#func-strdt
 */
class StrDt extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.STRDT;

  protected overloads = declare(RegularOperator.STRDT).set(
    [ TypeURL.XSD_STRING, 'namedNode' ],
    exprEval => ([ str, iri ]: [StringLiteral, NamedNode]) => {
      const lit = DF.literal(str.typedValue, DF.namedNode(iri.value));
      return new TermTransformer(exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider))
        .transformLiteral(lit);
    },
  ).collect();
}
/**
 * https://www.w3.org/TR/sparql11-query/#func-strlang
 */
class StrLan extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.STRLANG;

  protected overloads = declare(RegularOperator.STRLANG)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (val: string, language: string) => new LangStringLiteral(val, language.toLowerCase()),
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-uuid
 */
class Uuid extends RegularFunction {
  protected arity = 0;
  public operator = RegularOperator.UUID;

  protected overloads = declare(RegularOperator.UUID)
    .set([], () => () => new NamedNode(`urn:uuid:${uuid.v4()}`))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-struuid
 */
class StrUuid extends RegularFunction {
  protected arity = 0;
  public operator = RegularOperator.STRUUID;

  protected overloads = declare(RegularOperator.STRUUID)
    .set([], () => () => string(uuid.v4()))
    .collect();
}

// ----------------------------------------------------------------------------
// Functions on strings
// https://www.w3.org/TR/sparql11-query/#func-forms
// ----------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-strlen
 */
class StrLen extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.STRLEN;

  protected overloads = declare(RegularOperator.STRLEN)
    .onStringly1(() => str => integer([ ...str.typedValue ].length))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-substr
 */
class SubStr extends RegularFunction {
  protected arity = [ 2, 3 ];
  public operator = RegularOperator.SUBSTR;

  protected overloads = declare(RegularOperator.SUBSTR)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_INTEGER ],
      () => (source: string, startingLoc: number) => string([ ...source ].slice(startingLoc - 1).join('')),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_INTEGER ],
      () => (source: LangStringLiteral, startingLoc: NumericLiteral) => {
        const sub = [ ...source.typedValue ].slice(startingLoc.typedValue - 1).join('');
        return langString(sub, source.language);
      },
    )
    .onTernaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
      () => (source: string, startingLoc: number, length: number) =>
        string([ ...source ].slice(startingLoc - 1, length + startingLoc - 1).join('')),
    )
    .onTernary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
      () => (source: LangStringLiteral, startingLoc: NumericLiteral, length: NumericLiteral) => {
        const sub = [ ...source.typedValue ]
          .slice(startingLoc.typedValue - 1, length.typedValue + startingLoc.typedValue - 1)
          .join('');
        return langString(sub, source.language);
      },
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-ucase
 */
class Ucase extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.UCASE;

  protected overloads = declare(RegularOperator.UCASE)
    .onString1Typed(() => lit => string(lit.toUpperCase()))
    .onLangString1(() => lit => langString(lit.typedValue.toUpperCase(), lit.language))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-lcase
 */
class Lcase extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.LCASE;

  protected overloads = declare(RegularOperator.LCASE)
    .onString1Typed(() => lit => string(lit.toLowerCase()))
    .onLangString1(() => lit => langString(lit.typedValue.toLowerCase(), lit.language))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-strstarts
 * for this and the following functions you'll see (string, langstring) is not allowed. This behaviour is defined in:
 * https://www.w3.org/TR/sparql11-query/#func-arg-compatibility
 */
class StrStarts extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.STRSTARTS;

  protected overloads = declare(RegularOperator.STRSTARTS)
    .onBinaryTyped(
      [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => bool(arg1.startsWith(arg2)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: LangStringLiteral, arg2: LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.startsWith(arg2.typedValue));
      },
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-strends
 */
class StrEnds extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.STRENDS;

  protected overloads = declare(RegularOperator.STRENDS)
    .onBinaryTyped(
      [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => bool(arg1.endsWith(arg2)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: LangStringLiteral, arg2: LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.endsWith(arg2.typedValue));
      },
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-contains
 */
class Contains extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.CONTAINS;

  protected overloads = declare(RegularOperator.CONTAINS)
    .onBinaryTyped(
      [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => bool(arg1.includes(arg2)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: LangStringLiteral, arg2: LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.includes(arg2.typedValue));
      },
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-strbefore
 */
class StrBefore extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.STRBEFORE;

  protected overloads = declare(RegularOperator.STRBEFORE)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => string(arg1.slice(0, Math.max(0, arg1.indexOf(arg2)))),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING ],
      () => (arg1: LangStringLiteral, arg2: StringLiteral) => {
        const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
        const sub = arg1.typedValue.slice(0, Math.max(0, a1.indexOf(a2)));
        return sub || !a2 ? langString(sub, arg1.language) : string(sub);
      },
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: LangStringLiteral, arg2: LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new IncompatibleLanguageOperation(arg1, arg2);
        }
        const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
        const sub = arg1.typedValue.slice(0, Math.max(0, a1.indexOf(a2)));
        return sub || !a2 ? langString(sub, arg1.language) : string(sub);
      },
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-strafter
 */
class StrAfter extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.STRAFTER;

  protected overloads = declare(RegularOperator.STRAFTER)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => string(arg1.slice(arg1.indexOf(arg2)).slice(arg2.length)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING ],
      () => (arg1: LangStringLiteral, arg2: StringLiteral) => {
        const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
        const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
        return sub || !a2 ? langString(sub, arg1.language) : string(sub);
      },
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: LangStringLiteral, arg2: LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new IncompatibleLanguageOperation(arg1, arg2);
        }
        const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
        const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
        return sub || !a2 ? langString(sub, arg1.language) : string(sub);
      },
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-encode
 */
class EncodeForUri extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.ENCODE_FOR_URI;

  protected overloads = declare(RegularOperator.ENCODE_FOR_URI)
    .onStringly1Typed(() => val => string(encodeURI(val))).collect();
}

// See special operators
// class CONCAT extends RegularFunction {}

/**
 * https://www.w3.org/TR/sparql11-query/#func-langMatches
 */
class Langmatches extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.LANG_MATCHES;

  // TODO: Not an XPath function
  // TODO: Publish as package
  // https://www.ietf.org/rfc/rfc4647.txt
  // https://www.w3.org/TR/sparql11-query/#func-langMatches
  private static langMatches(tag: string, range: string): boolean {
    const langTags = tag.split('-');
    const rangeTags = range.split('-');

    if (!Langmatches.matchLangTag(rangeTags[0], langTags[0]) &&
      !Langmatches.isWildCard(langTags[0])) {
      return false;
    }

    let lI = 1;
    let rI = 1;
    while (rI < rangeTags.length) {
      if (Langmatches.isWildCard(rangeTags[rI])) {
        rI++;
        continue;
      }
      if (lI === langTags.length) {
        return false;
      }
      if (Langmatches.matchLangTag(rangeTags[rI], langTags[lI])) {
        lI++;
        rI++;
        continue;
      }
      if (langTags[lI].length === 1) {
        return false;
      }
      lI++;
    }
    return true;
  }

  private static isWildCard(tag: string): boolean {
    return tag === '*';
  }

  private static matchLangTag(left: string, right: string): boolean {
    const matchInitial = new RegExp(`/${left}/`, 'iu');
    return matchInitial.test(`/${right}/`);
  }

  protected overloads = declare(RegularOperator.LANG_MATCHES)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (tag: string, range: string) => bool(Langmatches.langMatches(tag, range)),
    ).collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-regex
 */
class Regex extends RegularFunction {
  protected arity = [ 2, 3 ];
  public operator = RegularOperator.REGEX;

  // https://www.w3.org/TR/xpath-functions/#func-matches
  // https://www.w3.org/TR/xpath-functions/#flags
  private static matches(text: string, pattern: string, flags?: string): boolean {
    // TODO: Only flags 'i' and 'm' match between XPath and JS.
    // 's', 'x', 'q', would need proper implementation.
    const reg = new RegExp(pattern, flags);
    return reg.test(text);
  }

  private static regex2(): (text: string, pattern: string) => BooleanLiteral {
    return (text: string, pattern: string) => bool(Regex.matches(text, pattern));
  }

  private static regex3(): (text: string, pattern: string, flags: string) => BooleanLiteral {
    return (text: string, pattern: string, flags: string) => bool(Regex.matches(text, pattern, flags));
  }

  protected overloads = declare(RegularOperator.REGEX)
    .onBinaryTyped([ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ], Regex.regex2)
    .onTernaryTyped([ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING, TypeURL.XSD_STRING ], Regex.regex3)
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-replace
 */
class Replace extends RegularFunction {
  protected arity = [ 3, 4 ];
  public operator = RegularOperator.REPLACE;

  // TODO: Fix flags
  // https://www.w3.org/TR/xpath-functions/#func-replace
  private static replace(arg: string, pattern: string, replacement: string, flags?: string): string {
    let reg = new RegExp(pattern, flags);
    if (!reg.global) {
      const flags_ = flags ?? '';
      reg = new RegExp(pattern, `${flags_}g`);
    }
    return arg.replace(reg, replacement);
  }

  protected overloads = declare(RegularOperator.REPLACE)
    .onTernaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg: string, pattern: string, replacement: string) =>
        string(Replace.replace(arg, pattern, replacement)),
    )
    .set(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => ([ arg, pattern, replacement ]: [LangStringLiteral, StringLiteral, StringLiteral]) => {
        const result = Replace.replace(arg.typedValue, pattern.typedValue, replacement.typedValue);
        return langString(result, arg.language);
      },
    )
    .onQuaternaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg: string, pattern: string, replacement: string, flags: string) =>
        string(Replace.replace(arg, pattern, replacement, flags)),
    )
    .set(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => ([ arg, pattern, replacement, flags ]:
      [LangStringLiteral, StringLiteral, StringLiteral, StringLiteral]) => {
        const result = Replace.replace(arg.typedValue, pattern.typedValue, replacement.typedValue, flags.typedValue);
        return langString(result, arg.language);
      },
    )
    .collect();
}

// ----------------------------------------------------------------------------
// Functions on numerics
// https://www.w3.org/TR/sparql11-query/#func-numerics
// ----------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-abs
 */
class Abs extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.ABS;

  protected overloads = declare(RegularOperator.ABS)
    .numericConverter(() => num => Math.abs(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-round
 */
class Round extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.ROUND;

  protected overloads = declare(RegularOperator.ROUND)
    .numericConverter(() => num => Math.round(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-ceil
 */
class Ceil extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.CEIL;

  protected overloads = declare(RegularOperator.CEIL)
    .numericConverter(() => num => Math.ceil(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-floor
 */
class Floor extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.FLOOR;

  protected overloads = declare(RegularOperator.FLOOR)
    .numericConverter(() => num => Math.floor(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#idp2130040
 */
class Rand extends RegularFunction {
  protected arity = 0;
  public operator = RegularOperator.RAND;

  protected overloads = declare(RegularOperator.RAND)
    .set([], () => () => double(Math.random()))
    .collect();
}

// ----------------------------------------------------------------------------
// Functions on Dates and Times
// https://www.w3.org/TR/sparql11-query/#func-date-time
// ----------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-now
 */
class Now extends RegularFunction {
  protected arity = 0;
  public operator = RegularOperator.NOW;

  protected overloads = declare(RegularOperator.NOW).set([], exprEval => () =>
    new DateTimeLiteral(toDateTimeRepresentation({
      date: exprEval.context.getSafe(KeysInitQuery.queryTimestamp),
      timeZone: exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
    }))).collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-year
 */
class Year extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.YEAR;

  protected overloads = declare(RegularOperator.YEAR)
    .onDateTime1(
      () => date => integer(date.typedValue.year),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [DateLiteral ]) => integer(date.typedValue.year))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-month
 */
class Month extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.MONTH;

  protected overloads = declare(RegularOperator.MONTH)
    .onDateTime1(
      () => date => integer(date.typedValue.month),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [ DateLiteral]) => integer(date.typedValue.month))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-day
 */
class Day extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.DAY;

  protected overloads = declare(RegularOperator.DAY)
    .onDateTime1(
      () => date => integer(date.typedValue.day),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [ DateLiteral]) => integer(date.typedValue.day))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-hours
 */
class Hours extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.HOURS;

  protected overloads = declare(RegularOperator.HOURS)
    .onDateTime1(
      () => date => integer(date.typedValue.hours),
    )
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ TimeLiteral]) => integer(time.typedValue.hours))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-minutes
 */
class Minutes extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.MINUTES;

  protected overloads = declare(RegularOperator.MINUTES)
    .onDateTime1(() => date => integer(date.typedValue.minutes))
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ TimeLiteral]) => integer(time.typedValue.minutes))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-seconds
 */
class Seconds extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SECONDS;

  protected overloads = declare(RegularOperator.SECONDS)
    .onDateTime1(() => date => decimal(date.typedValue.seconds))
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ TimeLiteral]) => integer(time.typedValue.seconds))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-timezone
 */
class Timezone extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.TIMEZONE;

  protected overloads = declare(RegularOperator.TIMEZONE)
    .onDateTime1(
      () => (date) => {
        const duration: Partial<IDayTimeDurationRepresentation> = {
          hours: date.typedValue.zoneHours,
          minutes: date.typedValue.zoneMinutes,
        };
        if (duration.hours === undefined && duration.minutes === undefined) {
          throw new InvalidTimezoneCall(date.str());
        }
        return new DayTimeDurationLiteral(duration);
      },
    )
    .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_DATE ]})
    .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_TIME ]})
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-tz
 */
class Tz extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.TZ;

  protected overloads = declare(RegularOperator.TZ)
    .onDateTime1(
      () => date => string(extractRawTimeZone(date.str())),
    )
    .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_DATE ]})
    .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_TIME ]})
    .collect();
}

// ----------------------------------------------------------------------------
// Hash functions
// https://www.w3.org/TR/sparql11-query/#func-hash
// ----------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-md5
 */
class Md5 extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.MD5;

  protected overloads = declare(RegularOperator.MD5)
    .onString1Typed(() => str => string(md5(str)))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha1
 */
class Sha1 extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SHA1;

  protected overloads = declare(RegularOperator.SHA1)
    .onString1Typed(() => str => string(sha1().update(str).digest('hex')))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha256
 */
class Sha256 extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SHA256;

  protected overloads = declare(RegularOperator.SHA256)
    .onString1Typed(() => str => string(sha256().update(str).digest('hex')))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha384
 */
class Sha384 extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SHA384;

  protected overloads = declare(RegularOperator.SHA384)
    .onString1Typed(() => str => string(sha384().update(str).digest('hex')))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha512
 */
class Sha512 extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SHA512;

  protected overloads = declare(RegularOperator.SHA512)
    .onString1Typed(() => str => string(sha512().update(str).digest('hex')))
    .collect();
}

// ----------------------------------------------------------------------------
// Functions for quoted triples
// https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
// ----------------------------------------------------------------------------

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
 */
class Triple extends RegularFunction {
  protected arity = 3;
  public operator = RegularOperator.TRIPLE;

  protected overloads = declare(RegularOperator.TRIPLE)
    .onTerm3(
      _ => (...args) => new Quad(
        args[0],
        args[1],
        args[2],
        new DefaultGraph(),
      ),
    )
    .collect();
}

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#subject
 */
class Subject extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SUBJECT;

  protected overloads = declare(RegularOperator.SUBJECT)
    .onQuad1(() => quad => quad.subject)
    .collect();
}

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#predicate
 */
class Predicate extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.PREDICATE;

  protected overloads = declare(RegularOperator.PREDICATE)
    .onQuad1(() => quad => quad.predicate)
    .collect();
}

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#object
 */
class ObjectSparqlFunction extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.OBJECT;

  protected overloads = declare(RegularOperator.OBJECT)
    .onQuad1(() => quad => quad.object)
    .collect();
}

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#istriple
 */
class IsTriple extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IS_TRIPLE;

  protected overloads = declare(RegularOperator.IS_TRIPLE)
    .onTerm1(() => term => bool(term.termType === 'quad'))
    .collect();
}

// End definitions.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

const equality = new Equality();
/**
 * Collect all the definitions from above into an object
 */
export const regularFunctions: Record<RegularOperator, RegularFunction> = {
  // --------------------------------------------------------------------------
  // Operator Mapping
  // https://www.w3.org/TR/sparql11-query/#OperatorMapping
  // --------------------------------------------------------------------------
  '!': new Not(),
  uplus: new UnaryPlus(),
  uminus: new UnaryMinus(),
  '*': new Multiplication(),
  '/': new Division(),
  '+': new Addition(),
  '-': new Subtraction(),
  '=': equality,
  '!=': new Inequality(),
  '<': new LesserThan(equality),
  '>': new GreaterThan(),
  '<=': new LesserThanEqual(),
  '>=': new GreaterThanEqual(),

  // --------------------------------------------------------------------------
  // Functions on RDF Terms
  // https://www.w3.org/TR/sparql11-query/#func-rdfTerms
  // --------------------------------------------------------------------------
  isiri: new IsIri(),
  isuri: new IsIri(),
  isblank: new IsBlank(),
  isliteral: new IsLiteral(),
  isnumeric: new IsNumeric(),
  str: new Str(),
  lang: new Lang(),
  datatype: new Datatype(),
  iri: new Iri(),
  uri: new Iri(),
  // 'BNODE': BNODE (see special operators),
  strdt: new StrDt(),
  strlang: new StrLan(),
  uuid: new Uuid(),
  struuid: new StrUuid(),

  // --------------------------------------------------------------------------
  // Functions on strings
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // --------------------------------------------------------------------------
  strlen: new StrLen(),
  substr: new SubStr(),
  ucase: new Ucase(),
  lcase: new Lcase(),
  strstarts: new StrStarts(),
  strends: new StrEnds(),
  contains: new Contains(),
  strbefore: new StrBefore(),
  strafter: new StrAfter(),
  encode_for_uri: new EncodeForUri(),
  // 'concat': CONCAT (see special operators)
  langmatches: new Langmatches(),
  regex: new Regex(),
  replace: new Replace(),

  // --------------------------------------------------------------------------
  // Functions on numerics
  // https://www.w3.org/TR/sparql11-query/#func-numerics
  // --------------------------------------------------------------------------
  abs: new Abs(),
  round: new Round(),
  ceil: new Ceil(),
  floor: new Floor(),
  rand: new Rand(),

  // --------------------------------------------------------------------------
  // Functions on Dates and Times
  // https://www.w3.org/TR/sparql11-query/#func-date-time
  // --------------------------------------------------------------------------
  now: new Now(),
  year: new Year(),
  month: new Month(),
  day: new Day(),
  hours: new Hours(),
  minutes: new Minutes(),
  seconds: new Seconds(),
  timezone: new Timezone(),
  tz: new Tz(),

  // --------------------------------------------------------------------------
  // Hash functions
  // https://www.w3.org/TR/sparql11-query/#func-hash
  // --------------------------------------------------------------------------
  md5: new Md5(),
  sha1: new Sha1(),
  sha256: new Sha256(),
  sha384: new Sha384(),
  sha512: new Sha512(),

  // --------------------------------------------------------------------------
  // Functions for quoted triples
  // https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
  // Additional operator mappings
  // https://w3c.github.io/rdf-star/cg-spec/2021-12-17.html#rdf-star-operator-mapping
  // --------------------------------------------------------------------------
  triple: new Triple(),
  subject: new Subject(),
  predicate: new Predicate(),
  object: new ObjectSparqlFunction(),
  istriple: new IsTriple(),
};
