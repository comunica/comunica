import { BaseFunctionDefinition, TermSparqlFunction } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { BlankNodeBindingsScoped } from '@comunica/data-factory';
import type {
  BooleanLiteral,
  Expression,
  IEvalContext,
  IInternalEvaluator,
  Literal,
  NamedOperator,
  NumericLiteral,
  OverloadTree,
  StringLiteral,
  Term,
  TermExpression,
  VariableExpression,
} from '@comunica/expression-evaluator';
import {
  addDurationToDateTime,
  BlankNode,
  bool,
  CastError,
  CoalesceError,
  DateLiteral,
  dateTime,
  DateTimeLiteral,
  DayTimeDurationLiteral,
  dayTimeDurationsToSeconds,
  decimal,
  declare,
  defaultedDateTimeRepresentation,
  defaultedDayTimeDurationRepresentation,
  defaultedDurationRepresentation,
  defaultedYearMonthDurationRepresentation,
  DefaultGraph,
  double,
  DurationLiteral,
  elapsedDuration,
  ExpressionError,
  expressionToVar,
  ExpressionType,
  extractRawTimeZone,
  float,
  IncompatibleLanguageOperation,
  InError,
  integer,
  InvalidArgumentTypes,
  InvalidTimezoneCall,
  langString,
  LangStringLiteral,
  NamedNode,
  negateDuration,
  parseDate,
  parseDateTime,
  parseDayTimeDuration,
  parseDuration,
  parseTime,
  parseXSDDecimal,
  parseXSDFloat,
  parseXSDInteger,
  parseYearMonthDuration,
  Quad,
  RDFEqualTypeError,
  SparqlOperator,
  string,
  TermTransformer,
  TimeLiteral,
  toDateTimeRepresentation,
  toUTCDate,
  trimToDayTimeDuration,
  trimToYearMonthDuration,
  TypeAlias,
  TypeURL,
  YearMonthDurationLiteral,
  yearMonthDurationsToMonths,
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

class Not extends TermSparqlFunction {
  protected arity = 1;

  public operator = SparqlOperator.NOT;

  protected overloads = declare(SparqlOperator.NOT)
    .onTerm1(() => val => bool(!val.coerceEBV()))
    .collect();
}

class UnaryPlus extends TermSparqlFunction {
  protected arity = 1;

  public operator = SparqlOperator.UPLUS;

  protected overloads = declare(SparqlOperator.UPLUS)
    .numericConverter(() => val => val)
    .collect();
}

class UnaryMinus extends TermSparqlFunction {
  protected arity = 1;

  public operator = SparqlOperator.UMINUS;

  protected overloads = declare(SparqlOperator.UMINUS)
    .numericConverter(() => val => -val)
    .collect();
}

class Multiplication extends TermSparqlFunction {
  protected arity = 2;

  public operator = SparqlOperator.MULTIPLICATION;

  protected overloads = declare(SparqlOperator.MULTIPLICATION)
    .arithmetic(() => (left, right) => new BigNumber(left).times(right).toNumber())
    .collect();
}

class Division extends TermSparqlFunction {
  protected arity = 2;

  public operator = SparqlOperator.DIVISION;

  protected overloads = declare(SparqlOperator.DIVISION)
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

class Addition extends TermSparqlFunction {
  protected arity = 2;

  public operator = SparqlOperator.ADDITION;

  protected overloads = declare(SparqlOperator.ADDITION)
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

class Subtraction extends TermSparqlFunction {
  protected arity = 2;

  public operator = SparqlOperator.SUBTRACTION;

  protected overloads = declare(SparqlOperator.SUBTRACTION)
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

/**
 * https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
 */
class Equality extends TermSparqlFunction {
  protected arity = 2;

  public operator = SparqlOperator.EQUAL;

  protected overloads = declare(SparqlOperator.EQUAL)
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

class Inequality extends TermSparqlFunction {
  public constructor(private readonly equalityFunction: TermSparqlFunction) {
    super();
  }

  protected arity = 2;

  public operator = SparqlOperator.NOT_EQUAL;

  protected overloads = declare(SparqlOperator.NOT_EQUAL)
    .set([ 'term', 'term' ], expressionEvaluator =>
      ([ first, second ]) =>
        bool(!(<BooleanLiteral> this.equalityFunction
          .applyOnTerms([ first, second ], expressionEvaluator)).typedValue))
    .collect();
}

class LesserThan extends TermSparqlFunction {
  // TODO: when all is done, this should be injected in some way!
  public constructor(private readonly equalityFunction: TermSparqlFunction) {
    super();
  }

  protected arity = 2;

  public operator = SparqlOperator.LT;

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

  protected overloads = declare(SparqlOperator.LT)
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

class GreaterThan extends TermSparqlFunction {
  public constructor(private readonly lessThanFunction: TermSparqlFunction) {
    super();
  }

  protected arity = 2;

  public operator = SparqlOperator.GT;

  protected overloads = declare(SparqlOperator.GT)
    .set([ 'term', 'term' ], expressionEvaluator =>
      ([ first, second ]) =>
        // X < Y -> Y > X
        this.lessThanFunction.applyOnTerms([ second, first ], expressionEvaluator))
    .collect();
}

class LesserThanEqual extends TermSparqlFunction {
  public constructor(
    private readonly equalityFunction: TermSparqlFunction,
    private readonly lessThanFunction: TermSparqlFunction,
  ) {
    super();
  }

  protected arity = 2;
  public operator = SparqlOperator.LTE;
  protected overloads = declare(SparqlOperator.LTE)
    .set([ 'term', 'term' ], exprEval =>
      ([ first, second ]) =>
        // X <= Y -> X < Y || X = Y
        // First check if the first is lesser than the second, then check if they are equal.
        // Doing this, the correct error will be thrown, each type that has a lesserThanEqual has a matching lesserThan.
        bool(
          (<BooleanLiteral> this.lessThanFunction.applyOnTerms([ first, second ], exprEval))
            .typedValue ||
          (<BooleanLiteral> this.equalityFunction.applyOnTerms([ first, second ], exprEval))
            .typedValue,
        ))
    .collect();
}

class GreaterThanEqual extends TermSparqlFunction {
  public constructor(private readonly lessThanEqualFunction: TermSparqlFunction) {
    super();
  }

  protected arity = 2;

  public operator = SparqlOperator.GTE;
  protected overloads = declare(SparqlOperator.GTE)
    .set([ 'term', 'term' ], exprEval =>
      ([ first, second ]) =>
        // X >= Y -> Y <= X
        this.lessThanEqualFunction.applyOnTerms([ second, first ], exprEval))
    .collect();
}

// ----------------------------------------------------------------------------
// Functions on RDF Terms
// https://www.w3.org/TR/sparql11-query/#func-rdfTerms
// ----------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-isIRI
 */
class IsIri extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.IS_IRI;
  protected overloads = declare(SparqlOperator.IS_IRI)
    .onTerm1(() => term => bool(term.termType === 'namedNode'))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-isBlank
 */
class IsBlank extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.IS_BLANK;

  protected overloads = declare(SparqlOperator.IS_BLANK)
    .onTerm1(() => term => bool(term.termType === 'blankNode'))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-isLiteral
 */
class IsLiteral extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.IS_LITERAL;
  protected overloads = declare(SparqlOperator.IS_LITERAL)
    .onTerm1(() => term => bool(term.termType === 'literal'))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-isNumeric
 */
class IsNumeric extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.IS_NUMERIC;

  protected overloads = declare(SparqlOperator.IS_NUMERIC)
    .onNumeric1(() => () => bool(true))
    .onTerm1(() => () => bool(false))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-str
 */
class Str extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.STR;
  protected overloads = declare(SparqlOperator.STR)
    .onTerm1(() => term => string(term.str()))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-lang
 */
class Lang extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.LANG;

  protected overloads = declare(SparqlOperator.LANG)
    .onLiteral1(() => lit => string(lit.language ?? ''))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-datatype
 */
class Datatype extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.DATATYPE;

  protected overloads = declare(SparqlOperator.DATATYPE)
    .onLiteral1(() => lit => new NamedNode(lit.dataType))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-iri
 */
class Iri extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.IRI;

  protected overloads = declare(SparqlOperator.IRI)
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
class StrDt extends TermSparqlFunction {
  protected arity = 2;
  public operator = SparqlOperator.STRDT;

  protected overloads = declare(SparqlOperator.STRDT).set(
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
class StrLan extends TermSparqlFunction {
  protected arity = 2;
  public operator = SparqlOperator.STRLANG;

  protected overloads = declare(SparqlOperator.STRLANG)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (val: string, language: string) => new LangStringLiteral(val, language.toLowerCase()),
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-uuid
 */
class Uuid extends TermSparqlFunction {
  protected arity = 0;
  public operator = SparqlOperator.UUID;

  protected overloads = declare(SparqlOperator.UUID)
    .set([], () => () => new NamedNode(`urn:uuid:${uuid.v4()}`))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-struuid
 */
class StrUuid extends TermSparqlFunction {
  protected arity = 0;
  public operator = SparqlOperator.STRUUID;

  protected overloads = declare(SparqlOperator.STRUUID)
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
class StrLen extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.STRLEN;

  protected overloads = declare(SparqlOperator.STRLEN)
    .onStringly1(() => str => integer([ ...str.typedValue ].length))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-substr
 */
class SubStr extends TermSparqlFunction {
  protected arity = [ 2, 3 ];
  public operator = SparqlOperator.SUBSTR;

  protected overloads = declare(SparqlOperator.SUBSTR)
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
class Ucase extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.UCASE;

  protected overloads = declare(SparqlOperator.UCASE)
    .onString1Typed(() => lit => string(lit.toUpperCase()))
    .onLangString1(() => lit => langString(lit.typedValue.toUpperCase(), lit.language))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-lcase
 */
class Lcase extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.LCASE;

  protected overloads = declare(SparqlOperator.LCASE)
    .onString1Typed(() => lit => string(lit.toLowerCase()))
    .onLangString1(() => lit => langString(lit.typedValue.toLowerCase(), lit.language))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-strstarts
 * for this and the following functions you'll see (string, langstring) is not allowed. This behaviour is defined in:
 * https://www.w3.org/TR/sparql11-query/#func-arg-compatibility
 */
class StrStarts extends TermSparqlFunction {
  protected arity = 2;
  public operator = SparqlOperator.STRSTARTS;

  protected overloads = declare(SparqlOperator.STRSTARTS)
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
class StrEnds extends TermSparqlFunction {
  protected arity = 2;
  public operator = SparqlOperator.STRENDS;

  protected overloads = declare(SparqlOperator.STRENDS)
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
class Contains extends TermSparqlFunction {
  protected arity = 2;
  public operator = SparqlOperator.CONTAINS;

  protected overloads = declare(SparqlOperator.CONTAINS)
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
class StrBefore extends TermSparqlFunction {
  protected arity = 2;
  public operator = SparqlOperator.STRBEFORE;

  protected overloads = declare(SparqlOperator.STRBEFORE)
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
class StrAfter extends TermSparqlFunction {
  protected arity = 2;
  public operator = SparqlOperator.STRAFTER;

  protected overloads = declare(SparqlOperator.STRAFTER)
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
class EncodeForUri extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.ENCODE_FOR_URI;

  protected overloads = declare(SparqlOperator.ENCODE_FOR_URI)
    .onStringly1Typed(() => val => string(encodeURI(val))).collect();
}

// See special operators
// class CONCAT extends RegularFunction {}

/**
 * https://www.w3.org/TR/sparql11-query/#func-langMatches
 */
class Langmatches extends TermSparqlFunction {
  protected arity = 2;
  public operator = SparqlOperator.LANG_MATCHES;

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

  protected overloads = declare(SparqlOperator.LANG_MATCHES)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (tag: string, range: string) => bool(Langmatches.langMatches(tag, range)),
    ).collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-regex
 */
class Regex extends TermSparqlFunction {
  protected arity = [ 2, 3 ];
  public operator = SparqlOperator.REGEX;

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

  protected overloads = declare(SparqlOperator.REGEX)
    .onBinaryTyped([ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ], Regex.regex2)
    .onTernaryTyped([ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING, TypeURL.XSD_STRING ], Regex.regex3)
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-replace
 */
class Replace extends TermSparqlFunction {
  protected arity = [ 3, 4 ];
  public operator = SparqlOperator.REPLACE;

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

  protected overloads = declare(SparqlOperator.REPLACE)
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
class Abs extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.ABS;

  protected overloads = declare(SparqlOperator.ABS)
    .numericConverter(() => num => Math.abs(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-round
 */
class Round extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.ROUND;

  protected overloads = declare(SparqlOperator.ROUND)
    .numericConverter(() => num => Math.round(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-ceil
 */
class Ceil extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.CEIL;

  protected overloads = declare(SparqlOperator.CEIL)
    .numericConverter(() => num => Math.ceil(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-floor
 */
class Floor extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.FLOOR;

  protected overloads = declare(SparqlOperator.FLOOR)
    .numericConverter(() => num => Math.floor(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#idp2130040
 */
class Rand extends TermSparqlFunction {
  protected arity = 0;
  public operator = SparqlOperator.RAND;

  protected overloads = declare(SparqlOperator.RAND)
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
class Now extends TermSparqlFunction {
  protected arity = 0;
  public operator = SparqlOperator.NOW;

  protected overloads = declare(SparqlOperator.NOW).set([], exprEval => () =>
    new DateTimeLiteral(toDateTimeRepresentation({
      date: exprEval.context.getSafe(KeysInitQuery.queryTimestamp),
      timeZone: exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
    }))).collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-year
 */
class Year extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.YEAR;

  protected overloads = declare(SparqlOperator.YEAR)
    .onDateTime1(
      () => date => integer(date.typedValue.year),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [DateLiteral ]) => integer(date.typedValue.year))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-month
 */
class Month extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.MONTH;

  protected overloads = declare(SparqlOperator.MONTH)
    .onDateTime1(
      () => date => integer(date.typedValue.month),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [ DateLiteral]) => integer(date.typedValue.month))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-day
 */
class Day extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.DAY;

  protected overloads = declare(SparqlOperator.DAY)
    .onDateTime1(
      () => date => integer(date.typedValue.day),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [ DateLiteral]) => integer(date.typedValue.day))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-hours
 */
class Hours extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.HOURS;

  protected overloads = declare(SparqlOperator.HOURS)
    .onDateTime1(
      () => date => integer(date.typedValue.hours),
    )
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ TimeLiteral]) => integer(time.typedValue.hours))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-minutes
 */
class Minutes extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.MINUTES;

  protected overloads = declare(SparqlOperator.MINUTES)
    .onDateTime1(() => date => integer(date.typedValue.minutes))
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ TimeLiteral]) => integer(time.typedValue.minutes))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-seconds
 */
class Seconds extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.SECONDS;

  protected overloads = declare(SparqlOperator.SECONDS)
    .onDateTime1(() => date => decimal(date.typedValue.seconds))
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ TimeLiteral]) => integer(time.typedValue.seconds))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-timezone
 */
class Timezone extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.TIMEZONE;

  protected overloads = declare(SparqlOperator.TIMEZONE)
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
class Tz extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.TZ;

  protected overloads = declare(SparqlOperator.TZ)
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
class Md5 extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.MD5;

  protected overloads = declare(SparqlOperator.MD5)
    .onString1Typed(() => str => string(md5(str)))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha1
 */
class Sha1 extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.SHA1;

  protected overloads = declare(SparqlOperator.SHA1)
    .onString1Typed(() => str => string(sha1().update(str).digest('hex')))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha256
 */
class Sha256 extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.SHA256;

  protected overloads = declare(SparqlOperator.SHA256)
    .onString1Typed(() => str => string(sha256().update(str).digest('hex')))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha384
 */
class Sha384 extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.SHA384;

  protected overloads = declare(SparqlOperator.SHA384)
    .onString1Typed(() => str => string(sha384().update(str).digest('hex')))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha512
 */
class Sha512 extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.SHA512;

  protected overloads = declare(SparqlOperator.SHA512)
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
class Triple extends TermSparqlFunction {
  protected arity = 3;
  public operator = SparqlOperator.TRIPLE;

  protected overloads = declare(SparqlOperator.TRIPLE)
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
class Subject extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.SUBJECT;

  protected overloads = declare(SparqlOperator.SUBJECT)
    .onQuad1(() => quad => quad.subject)
    .collect();
}

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#predicate
 */
class Predicate extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.PREDICATE;

  protected overloads = declare(SparqlOperator.PREDICATE)
    .onQuad1(() => quad => quad.predicate)
    .collect();
}

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#object
 */
class ObjectSparqlFunction extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.OBJECT;

  protected overloads = declare(SparqlOperator.OBJECT)
    .onQuad1(() => quad => quad.object)
    .collect();
}

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#istriple
 */
class IsTriple extends TermSparqlFunction {
  protected arity = 1;
  public operator = SparqlOperator.IS_TRIPLE;

  protected overloads = declare(SparqlOperator.IS_TRIPLE)
    .onTerm1(() => term => bool(term.termType === 'quad'))
    .collect();
}

// End definitions.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Functional forms
// ----------------------------------------------------------------------------

// BOUND ----------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-bound
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class Bound extends BaseFunctionDefinition {
  protected arity = 1;

  public operator = SparqlOperator.BOUND;

  public apply = async({ args, mapping }: IEvalContext): Promise<TermExpression> => {
    const variable = <VariableExpression> args[0];
    if (variable.expressionType !== ExpressionType.Variable) {
      throw new InvalidArgumentTypes(args, SparqlOperator.BOUND);
    }
    const val = mapping.has(expressionToVar(variable));
    return bool(val);
  };
}

// IF -------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-if
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class IfSPARQL extends BaseFunctionDefinition {
  protected arity = 3;

  public operator = SparqlOperator.IF;

  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
    const valFirst = await exprEval.evaluatorExpressionEvaluation(args[0], mapping);
    const ebv = valFirst.coerceEBV();
    return ebv ?
      exprEval.evaluatorExpressionEvaluation(args[1], mapping) :
      exprEval.evaluatorExpressionEvaluation(args[2], mapping);
  };
}

// COALESCE -------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-coalesce
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class Coalesce extends BaseFunctionDefinition {
  protected arity = Number.POSITIVE_INFINITY;

  public operator = SparqlOperator.COALESCE;

  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
    const errors: Error[] = [];
    for (const expr of args) {
      try {
        return await exprEval.evaluatorExpressionEvaluation(expr, mapping);
      } catch (error: unknown) {
        errors.push(<Error> error);
      }
    }
    throw new CoalesceError(errors);
  };
}

// Logical-or (||) ------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-or
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class LogicalOr extends BaseFunctionDefinition {
  protected arity = 2;

  public operator = SparqlOperator.LOGICAL_OR;

  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
    const [ leftExpr, rightExpr ] = args;
    try {
      const leftTerm = await exprEval.evaluatorExpressionEvaluation(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (left) {
        return bool(true);
      }
      const rightTerm = await exprEval.evaluatorExpressionEvaluation(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (error: unknown) {
      const rightErrorTerm = await exprEval.evaluatorExpressionEvaluation(rightExpr, mapping);
      const rightError = rightErrorTerm.coerceEBV();
      if (!rightError) {
        throw error;
      }
      return bool(true);
    }
  };
}

// Logical-and (&&) -----------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-and
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class LogicalAnd extends BaseFunctionDefinition {
  protected arity = 2;

  public operator = SparqlOperator.LOGICAL_AND;

  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
    const [ leftExpr, rightExpr ] = args;
    try {
      const leftTerm = await exprEval.evaluatorExpressionEvaluation(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (!left) {
        return bool(false);
      }
      const rightTerm = await exprEval.evaluatorExpressionEvaluation(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (error: unknown) {
      const rightErrorTerm = await exprEval.evaluatorExpressionEvaluation(rightExpr, mapping);
      const rightError = rightErrorTerm.coerceEBV();
      if (rightError) {
        throw error;
      }
      return bool(false);
    }
  };
}

// SameTerm -------------------------------------------------------------------

/**
 * TODO: why is this a special function?
 * https://www.w3.org/TR/sparql11-query/#func-sameTerm
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class SameTerm extends BaseFunctionDefinition {
  protected arity = 2;

  public operator = SparqlOperator.SAME_TERM;

  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
    const [ leftExpr, rightExpr ] = args.map(arg => exprEval.evaluatorExpressionEvaluation(arg, mapping));
    const [ left, right ] = await Promise.all([ leftExpr, rightExpr ]);
    return bool(left.toRDF().equals(right.toRDF()));
  };
}

// IN -------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class InSPARQL extends BaseFunctionDefinition {
  // TODO: when all is done, this should be injected in some way!
  public constructor(private readonly equalityFunction: TermSparqlFunction) {
    super();
  }

  protected arity = Number.POSITIVE_INFINITY;

  public operator = SparqlOperator.IN;

  public override checkArity(args: Expression[]): boolean {
    return args.length > 0;
  }

  public apply = async(context: IEvalContext): Promise<TermExpression> => {
    const { args, mapping, exprEval } = context;
    const [ leftExpr, ...remaining ] = args;
    const left = await exprEval.evaluatorExpressionEvaluation(leftExpr, mapping);
    return await this.inRecursive(left, { ...context, args: remaining }, []);
  };

  private async inRecursive(
    needle: TermExpression,
    context: IEvalContext,
    results: (Error | false)[],
  ): Promise<TermExpression> {
    const { args, mapping, exprEval } = context;
    if (args.length === 0) {
      const noErrors = results.every(val => !val);
      return noErrors ? bool(false) : Promise.reject(new InError(results));
    }

    try {
      // We know this will not be undefined because we check args.length === 0
      const nextExpression = args.shift()!;
      const next = await exprEval.evaluatorExpressionEvaluation(nextExpression, mapping);
      if ((<BooleanLiteral> this.equalityFunction.applyOnTerms([ needle, next ], exprEval)).typedValue) {
        return bool(true);
      }
      return this.inRecursive(needle, context, [ ...results, false ]);
    } catch (error: unknown) {
      return this.inRecursive(needle, context, [ ...results, <Error> error ]);
    }
  }
}

// NOT IN ---------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-not-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class NotInSPARQL extends BaseFunctionDefinition {
  // TODO: when all is done, this should be injected in some way!
  public constructor(private readonly inFunction: BaseFunctionDefinition) {
    super();
  }

  protected arity = Number.POSITIVE_INFINITY;

  public operator = SparqlOperator.NOT_IN;

  public override checkArity(args: Expression[]): boolean {
    return args.length > 0;
  }

  public apply = async(context: IEvalContext): Promise<TermExpression> => {
    const isIn = await this.inFunction.apply(context);
    return bool(!(<BooleanLiteral> isIn).typedValue);
  };
}

// ----------------------------------------------------------------------------
// Annoying functions
// ----------------------------------------------------------------------------

// CONCAT ---------------------------------------------------------------------

/**
 * This OverloadTree with the constant function will handle both type promotion and subtype-substitution
 */
const concatTree: OverloadTree = declare(SparqlOperator.CONCAT).onStringly1(() => expr => expr)
  .collect();

/**
 * https://www.w3.org/TR/sparql11-query/#func-concat
 */
class Concat extends BaseFunctionDefinition {
  protected arity = Number.POSITIVE_INFINITY;

  public operator = SparqlOperator.CONCAT;

  public apply = async(context: IEvalContext): Promise<TermExpression> => {
    const { args, mapping, exprEval } = context;
    const pLits: Promise<Literal<string>>[] = args
      .map(async expr => exprEval.evaluatorExpressionEvaluation(expr, mapping))
      .map(async(pTerm) => {
        const operation = concatTree.search(
          [ await pTerm ],
          exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider),
          exprEval.context.getSafe(KeysInitQuery.functionArgumentsCache),
        );
        if (!operation) {
          throw new InvalidArgumentTypes(args, SparqlOperator.CONCAT);
        }
        return <Literal<string>> operation(exprEval)([ await pTerm ]);
      });
    const lits = await Promise.all(pLits);
    const strings = lits.map(lit => lit.typedValue);
    const joined = strings.join('');
    const lang = langAllEqual(lits) ? lits[0].language : undefined;
    return lang ? langString(joined, lang) : string(joined);
  };
}

function langAllEqual(lits: Literal<string>[]): boolean {
  return lits.length > 0 && lits.every(lit => lit.language === lits[0].language);
}

// ----------------------------------------------------------------------------
// Context dependant functions
// ----------------------------------------------------------------------------

// BNODE ---------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-bnode
 * id has to be distinct over all id's in dataset
 */
class BNode extends BaseFunctionDefinition {
  /**
   * This OverloadTree with the constant function will handle both type promotion and subtype-substitution
   */
  private static readonly bnodeTree = declare(SparqlOperator.BNODE).onString1(() => arg => arg).collect();

  /**
   * A counter that keeps track blank node generated through BNODE() SPARQL
   * expressions.
   */
  private static bnodeCounter = 0;

  protected arity = Number.POSITIVE_INFINITY;

  public operator = SparqlOperator.BNODE;

  public override checkArity(args: Expression[]): boolean {
    return args.length === 0 || args.length === 1;
  }

  public apply = async(context: IEvalContext): Promise<TermExpression> => {
    const { args, mapping, exprEval } = context;
    const input = args.length === 1 ?
      await exprEval.evaluatorExpressionEvaluation(args[0], mapping) :
      undefined;

    let strInput: string | undefined;
    if (input) {
      const operation = BNode.bnodeTree.search(
        [ input ],
        exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider),
        exprEval.context.getSafe(KeysInitQuery.functionArgumentsCache),
      );
      if (!operation) {
        throw new InvalidArgumentTypes(args, SparqlOperator.BNODE);
      }
      strInput = operation(exprEval)([ input ]).str();
    }

    const bnode = new BlankNodeBindingsScoped(strInput ?? `BNODE_${BNode.bnodeCounter++}`);
    return new BlankNode(bnode);
  };
}

const equality = new Equality();
const lesserThan = new LesserThan(equality);
const lesserThanEqual = new LesserThanEqual(equality, lesserThan);
const sparqlIn = new InSPARQL(equality);
/**
 * Collect all the definitions from above into an object
 */
export const sparqlFunctions: Record<SparqlOperator, BaseFunctionDefinition> = {
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
  '!=': new Inequality(equality),
  '<': lesserThan,
  '>': new GreaterThan(lesserThan),
  '<=': lesserThanEqual,
  '>=': new GreaterThanEqual(lesserThanEqual),

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
  isTriple: new IsTriple(),

  // Special
  bound: new Bound(),
  if: new IfSPARQL(),
  coalesce: new Coalesce(),
  '&&': new LogicalAnd(),
  '||': new LogicalOr(),
  sameterm: new SameTerm(),
  in: sparqlIn,
  notin: new NotInSPARQL(sparqlIn),
  // Annoying functions
  concat: new Concat(),
  // Context dependent functions
  bnode: new BNode(),
};

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
