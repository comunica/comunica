import { RegularFunction } from '@comunica/bus-function-factory/lib/implementation/Core';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';

import type { IInternalEvaluator } from '@comunica/expression-evaluator';
import * as E from '@comunica/expression-evaluator/lib/expressions';
import type { Quad } from '@comunica/expression-evaluator/lib/expressions';
import {
  bool,
  decimal,
  declare,
  double,
  integer,
  langString,
  string,
} from '@comunica/expression-evaluator/lib/functions/Helpers';
import { TermTransformer } from '@comunica/expression-evaluator/lib/transformers/TermTransformer';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';
import { TypeAlias, TypeURL } from '@comunica/expression-evaluator/lib/util/Consts';
import {
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
} from '@comunica/expression-evaluator/lib/util/DateTimeHelpers';
import * as Err from '@comunica/expression-evaluator/lib/util/Errors';
import { addDurationToDateTime, elapsedDuration } from '@comunica/expression-evaluator/lib/util/SpecAlgos';
import type { IDayTimeDurationRepresentation } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { BigNumber } from 'bignumber.js';
import { sha1, sha256, sha384, sha512 } from 'hash.js';
import { DataFactory } from 'rdf-data-factory';
import { resolve as resolveRelativeIri } from 'relative-to-absolute-iri';
import { hash as md5 } from 'spark-md5';
import * as uuid from 'uuid';
import * as X from './XPathFunctions';

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

  public operator = C.RegularOperator.NOT;

  protected overloads = declare(C.RegularOperator.NOT)
    .onTerm1(() => val => bool(!val.coerceEBV()))
    .collect();
}

class UnaryPlus extends RegularFunction {
  protected arity = 1;

  public operator = C.RegularOperator.UPLUS;

  protected overloads = declare(C.RegularOperator.UPLUS)
    .numericConverter(() => val => val)
    .collect();
}

class UnaryMinus extends RegularFunction {
  protected arity = 1;

  public operator = C.RegularOperator.UMINUS;

  protected overloads = declare(C.RegularOperator.UMINUS)
    .numericConverter(() => val => -val)
    .collect();
}

class Multiplication extends RegularFunction {
  protected arity = 2;

  public operator = C.RegularOperator.MULTIPLICATION;

  protected overloads = declare(C.RegularOperator.MULTIPLICATION)
    .arithmetic(() => (left, right) => new BigNumber(left).times(right).toNumber())
    .collect();
}

class Division extends RegularFunction {
  protected arity = 2;

  public operator = C.RegularOperator.DIVISION;

  protected overloads = declare(C.RegularOperator.DIVISION)
    .arithmetic(() => (left, right) => new BigNumber(left).div(right).toNumber())
    .onBinaryTyped(
      [ TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
      () => (left: number, right: number) => {
        if (right === 0) {
          throw new Err.ExpressionError('Integer division by 0');
        }
        return decimal(new BigNumber(left).div(right).toNumber());
      },
    )
    .collect();
}

class Addition extends RegularFunction {
  protected arity = 2;

  public operator = C.RegularOperator.ADDITION;

  protected overloads = declare(C.RegularOperator.ADDITION)
    .arithmetic(() => (left, right) => new BigNumber(left).plus(right).toNumber())
    .set([ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ date, dur ]: [ E.DateTimeLiteral, E.DayTimeDurationLiteral ]) =>
        // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-dateTime
        new E.DateTimeLiteral(addDurationToDateTime(date.typedValue, defaultedDurationRepresentation(dur.typedValue))))
    .copy({
      from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ],
      to: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_YEAR_MONTH_DURATION ],
    })
    .set([ TypeURL.XSD_DATE, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ date, dur ]: [E.DateLiteral, E.DurationLiteral]) =>
        // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-date
        new E.DateLiteral(
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
      ([ time, dur ]: [E.TimeLiteral, E.DurationLiteral]) =>
        // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-time
        new E.TimeLiteral(
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

  public operator = C.RegularOperator.SUBTRACTION;

  protected overloads = declare(C.RegularOperator.SUBTRACTION)
    .arithmetic(() => (left, right) => new BigNumber(left).minus(right).toNumber())
    .set([ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ], exprEval =>
      ([ date1, date2 ]: [ E.DateTimeLiteral, E.DateTimeLiteral ]) =>
        // https://www.w3.org/TR/xpath-functions/#func-subtract-dateTimes;
        new E.DayTimeDurationLiteral(elapsedDuration(
          date1.typedValue,
          date2.typedValue,
          exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
        )))
    .copy({ from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_DATE, TypeURL.XSD_DATE ]})
    .copy({ from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_TIME, TypeURL.XSD_TIME ]})
    .set([ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ date, dur ]: [ E.DateTimeLiteral, E.DayTimeDurationLiteral ]) =>
        // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-dateTime
        new E.DateTimeLiteral(addDurationToDateTime(
          date.typedValue,
          defaultedDurationRepresentation(negateDuration(dur.typedValue)),
        )))
    .copy({
      from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ],
      to: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_YEAR_MONTH_DURATION ],
    })
    .set([ TypeURL.XSD_DATE, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ date, dur ]: [ E.DateLiteral, E.DayTimeDurationLiteral ]) =>
        // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-date
        new E.DateLiteral(addDurationToDateTime(
          defaultedDateTimeRepresentation(date.typedValue),
          defaultedDurationRepresentation(negateDuration(dur.typedValue)),
        )))
    .copy({
      from: [ TypeURL.XSD_DATE, TypeURL.XSD_DAY_TIME_DURATION ],
      to: [ TypeURL.XSD_DATE, TypeURL.XSD_YEAR_MONTH_DURATION ],
    })
    .set([ TypeURL.XSD_TIME, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ time, dur ]: [ E.TimeLiteral, E.DayTimeDurationLiteral ]) =>
        // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-date
        new E.TimeLiteral(addDurationToDateTime(
          defaultedDateTimeRepresentation(time.typedValue),
          defaultedDurationRepresentation(negateDuration(dur.typedValue)),
        )))
    .collect();
}

// https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
class Equality extends RegularFunction {
  protected arity = 2;

  public operator = C.RegularOperator.EQUAL;

  protected overloads = declare(C.RegularOperator.EQUAL)
    .numberTest(() => (left, right) => left === right)
    .stringTest(() => (left, right) => left.localeCompare(right) === 0)
    .set(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => ([ left, right ]: E.LangStringLiteral[]) => bool(left.str() === right.str() &&
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
          (<E.BooleanLiteral> this.applyOnTerms([ (<Quad> left).subject, (<Quad> right).subject ], exprEval))
            .coerceEBV() &&
          (<E.BooleanLiteral> this.applyOnTerms([ (<Quad> left).predicate, (<Quad> right).predicate ], exprEval))
            .coerceEBV() &&
          (<E.BooleanLiteral> this.applyOnTerms([ (<Quad> left).object, (<Quad> right).object ], exprEval))
            .coerceEBV() &&
          (<E.BooleanLiteral> this.applyOnTerms([ (<Quad> left).graph, (<Quad> right).graph ], exprEval))
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
          throw new Err.RDFEqualTypeError([ _left, _right ]);
        }
        return bool(val);
      },
      false,
    )
    .set([ TypeURL.XSD_DURATION, TypeURL.XSD_DURATION ], () =>
      ([ dur1, dur2 ]: [ E.DurationLiteral, E.DurationLiteral ]) =>
        bool(yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur1.typedValue)) ===
          yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur2.typedValue)) &&
          dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur1.typedValue)) ===
          dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur2.typedValue))))
    .set([ TypeURL.XSD_TIME, TypeURL.XSD_TIME ], exprEval =>
      ([ time1, time2 ]: [E.TimeLiteral, E.TimeLiteral]) =>
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

  public operator = C.RegularOperator.NOT_EQUAL;

  protected overloads = declare(C.RegularOperator.NOT_EQUAL)
    .set([ 'term', 'term' ], expressionEvaluator =>
      ([ first, second ]) =>
        bool(!(<E.BooleanLiteral> regularFunctions[C.RegularOperator.EQUAL]
          .applyOnTerms([ first, second ], expressionEvaluator)).typedValue))
    .collect();
}

class LesserThan extends RegularFunction {
  // TODO: when all is done, this should be injected in some way!
  public constructor(private readonly equalityFunction: RegularFunction) {
    super();
  }

  protected arity = 2;

  public operator = C.RegularOperator.LT;

  private quadComponentTest(left: E.Term, right: E.Term, exprEval: IInternalEvaluator): boolean | undefined {
    // If components are equal, we don't have an answer
    const componentEqual = this.equalityFunction.applyOnTerms(
      [ left, right ],
      exprEval,
    );
    if ((<E.BooleanLiteral> componentEqual).typedValue) {
      return undefined;
    }

    const componentLess = this.applyOnTerms(
      [ left, right ],
      exprEval,
    );
    return (<E.BooleanLiteral>componentLess).typedValue;
  }

  protected overloads = declare(C.RegularOperator.LT)
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
      ([ dur1L, dur2L ]: [E.YearMonthDurationLiteral, E.YearMonthDurationLiteral]) =>
        // https://www.w3.org/TR/xpath-functions/#func-yearMonthDuration-less-than
        bool(yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur1L.typedValue)) <
          yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur2L.typedValue))))
    .set([ TypeURL.XSD_DAY_TIME_DURATION, TypeURL.XSD_DAY_TIME_DURATION ], () =>
      ([ dur1, dur2 ]: [E.DayTimeDurationLiteral, E.DayTimeDurationLiteral]) =>
        // https://www.w3.org/TR/xpath-functions/#func-dayTimeDuration-greater-than
        bool(dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur1.typedValue)) <
          dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur2.typedValue))))
    .set([ TypeURL.XSD_TIME, TypeURL.XSD_TIME ], exprEval =>
      ([ time1, time2 ]: [E.TimeLiteral, E.TimeLiteral]) =>
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
      exprEval => ([ left, right ]: [E.Quad, E.Quad]) => {
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

  public operator = C.RegularOperator.GT;

  protected overloads = declare(C.RegularOperator.GT)
    .set([ 'term', 'term' ], expressionEvaluator =>
      ([ first, second ]) =>
        // X < Y -> Y > X
        regularFunctions[C.RegularOperator.LT].applyOnTerms([ second, first ], expressionEvaluator))
    .collect();
}

class LesserThanEqual extends RegularFunction {
  protected arity = 2;
  public operator = C.RegularOperator.LTE;
  protected overloads = declare(C.RegularOperator.LTE)
    .set([ 'term', 'term' ], exprEval =>
      ([ first, second ]) =>
        // X <= Y -> X < Y || X = Y
        // First check if the first is lesser than the second, then check if they are equal.
        // Doing this, the correct error will be thrown, each type that has a lesserThanEqual has a matching lesserThan.
        bool(
          (<E.BooleanLiteral> regularFunctions[C.RegularOperator.LT].applyOnTerms([ first, second ], exprEval))
            .typedValue ||
          (<E.BooleanLiteral> regularFunctions[C.RegularOperator.EQUAL].applyOnTerms([ first, second ], exprEval))
            .typedValue,
        ))
    .collect();
}

class GreaterThanEqual extends RegularFunction {
  protected arity = 2;

  public operator = C.RegularOperator.GTE;
  protected overloads = declare(C.RegularOperator.GTE)
    .set([ 'term', 'term' ], exprEval =>
      ([ first, second ]) =>
        // X >= Y -> Y <= X
        regularFunctions[C.RegularOperator.LTE].applyOnTerms([ second, first ], exprEval))
    .collect();
}

// ----------------------------------------------------------------------------
// Functions on RDF Terms
// https://www.w3.org/TR/sparql11-query/#func-rdfTerms
// ----------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-isIRI
 */
class IsIRI extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.IS_IRI;
  protected overloads = declare(C.RegularOperator.IS_IRI)
    .onTerm1(() => term => bool(term.termType === 'namedNode'))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-isBlank
 */
class IsBlank extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.IS_BLANK;

  protected overloads = declare(C.RegularOperator.IS_BLANK)
    .onTerm1(() => term => bool(term.termType === 'blankNode'))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-isLiteral
 */
class IsLiteral extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.IS_LITERAL;
  protected overloads = declare(C.RegularOperator.IS_LITERAL)
    .onTerm1(() => term => bool(term.termType === 'literal'))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-isNumeric
 */
class IsNumeric extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.IS_NUMERIC;

  protected overloads = declare(C.RegularOperator.IS_NUMERIC)
    .onNumeric1(() => () => bool(true))
    .onTerm1(() => () => bool(false))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-str
 */
class STR extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.STR;
  protected overloads = declare(C.RegularOperator.STR)
    .onTerm1(() => term => string(term.str()))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-lang
 */
class Lang extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.LANG;

  protected overloads = declare(C.RegularOperator.LANG)
    .onLiteral1(() => lit => string(lit.language ?? ''))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-datatype
 */
class Datatype extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.DATATYPE;

  protected overloads = declare(C.RegularOperator.DATATYPE)
    .onLiteral1(() => lit => new E.NamedNode(lit.dataType))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-iri
 */
class IRI extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.IRI;

  protected overloads = declare(C.RegularOperator.IRI)
    .set([ 'namedNode' ], exprEval => (args) => {
      const lit = <E.NamedNode> args[0];
      const iri = resolveRelativeIri(lit.str(), exprEval.context.get(KeysInitQuery.baseIRI) ?? '');
      return new E.NamedNode(iri);
    })
    .onString1(exprEval => (lit) => {
      const iri = resolveRelativeIri(lit.str(), exprEval.context.get(KeysInitQuery.baseIRI) ?? '');
      return new E.NamedNode(iri);
    })
    .collect();
}

// See special functions
// class BNODE extends RegularFunction {};

/**
 * https://www.w3.org/TR/sparql11-query/#func-strdt
 */
class STRDT extends RegularFunction {
  protected arity = 2;
  public operator = C.RegularOperator.STRDT;

  protected overloads = declare(C.RegularOperator.STRDT).set(
    [ TypeURL.XSD_STRING, 'namedNode' ],
    exprEval => ([ str, iri ]: [E.StringLiteral, E.NamedNode]) => {
      const lit = DF.literal(str.typedValue, DF.namedNode(iri.value));
      return new TermTransformer(exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider))
        .transformLiteral(lit);
    },
  ).collect();
}
/**
 * https://www.w3.org/TR/sparql11-query/#func-strlang
 */
class STRLANG extends RegularFunction {
  protected arity = 2;
  public operator = C.RegularOperator.STRLANG;

  protected overloads = declare(C.RegularOperator.STRLANG)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (val: string, language: string) => new E.LangStringLiteral(val, language.toLowerCase()),
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-uuid
 */
class UUID extends RegularFunction {
  protected arity = 0;
  public operator = C.RegularOperator.UUID;

  protected overloads = declare(C.RegularOperator.UUID)
    .set([], () => () => new E.NamedNode(`urn:uuid:${uuid.v4()}`))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-struuid
 */
class STRUUID extends RegularFunction {
  protected arity = 0;
  public operator = C.RegularOperator.STRUUID;

  protected overloads = declare(C.RegularOperator.STRUUID)
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
class STRLEN extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.STRLEN;

  protected overloads = declare(C.RegularOperator.STRLEN)
    .onStringly1(() => str => integer([ ...str.typedValue ].length))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-substr
 */
class SUBSTR extends RegularFunction {
  protected arity = [ 2, 3 ];
  public operator = C.RegularOperator.SUBSTR;

  protected overloads = declare(C.RegularOperator.SUBSTR)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_INTEGER ],
      () => (source: string, startingLoc: number) => string([ ...source ].slice(startingLoc - 1).join('')),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_INTEGER ],
      () => (source: E.LangStringLiteral, startingLoc: E.NumericLiteral) => {
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
      () => (source: E.LangStringLiteral, startingLoc: E.NumericLiteral, length: E.NumericLiteral) => {
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
class UCASE extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.UCASE;

  protected overloads = declare(C.RegularOperator.UCASE)
    .onString1Typed(() => lit => string(lit.toUpperCase()))
    .onLangString1(() => lit => langString(lit.typedValue.toUpperCase(), lit.language))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-lcase
 */
class LCASE extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.LCASE;

  protected overloads = declare(C.RegularOperator.LCASE)
    .onString1Typed(() => lit => string(lit.toLowerCase()))
    .onLangString1(() => lit => langString(lit.typedValue.toLowerCase(), lit.language))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-strstarts
 * for this and the following functions you'll see (string, langstring) is not allowed. This behaviour is defined in:
 * https://www.w3.org/TR/sparql11-query/#func-arg-compatibility
 */
class STRSTARTS extends RegularFunction {
  protected arity = 2;
  public operator = C.RegularOperator.STRSTARTS;

  protected overloads = declare(C.RegularOperator.STRSTARTS)
    .onBinaryTyped(
      [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => bool(arg1.startsWith(arg2)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.startsWith(arg2.typedValue));
      },
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-strends
 */
class STRENDS extends RegularFunction {
  protected arity = 2;
  public operator = C.RegularOperator.STRENDS;

  protected overloads = declare(C.RegularOperator.STRENDS)
    .onBinaryTyped(
      [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => bool(arg1.endsWith(arg2)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.endsWith(arg2.typedValue));
      },
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-contains
 */
class CONTAINS extends RegularFunction {
  protected arity = 2;
  public operator = C.RegularOperator.CONTAINS;

  protected overloads = declare(C.RegularOperator.CONTAINS)
    .onBinaryTyped(
      [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => bool(arg1.includes(arg2)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.includes(arg2.typedValue));
      },
    )
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-strbefore
 */
class STRBEFORE extends RegularFunction {
  protected arity = 2;
  public operator = C.RegularOperator.STRBEFORE;

  protected overloads = declare(C.RegularOperator.STRBEFORE)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => string(arg1.slice(0, Math.max(0, arg1.indexOf(arg2)))),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.StringLiteral) => {
        const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
        const sub = arg1.typedValue.slice(0, Math.max(0, a1.indexOf(a2)));
        return sub || !a2 ? langString(sub, arg1.language) : string(sub);
      },
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
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
class STRAFTER extends RegularFunction {
  protected arity = 2;
  public operator = C.RegularOperator.STRAFTER;

  protected overloads = declare(C.RegularOperator.STRAFTER)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => string(arg1.slice(arg1.indexOf(arg2)).slice(arg2.length)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.StringLiteral) => {
        const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
        const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
        return sub || !a2 ? langString(sub, arg1.language) : string(sub);
      },
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
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
class ENCODE_FOR_URI extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.ENCODE_FOR_URI;

  protected overloads = declare(C.RegularOperator.ENCODE_FOR_URI)
    .onStringly1Typed(() => val => string(encodeURI(val))).collect();
}

// See special operators
// class CONCAT extends RegularFunction {}

/**
 * https://www.w3.org/TR/sparql11-query/#func-langMatches
 */
class Langmatches extends RegularFunction {
  protected arity = 2;
  public operator = C.RegularOperator.LANG_MATCHES;

  protected overloads = declare(C.RegularOperator.LANG_MATCHES)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (tag: string, range: string) => bool(X.langMatches(tag, range)),
    ).collect();
}

function regex2(): (text: string, pattern: string) => E.BooleanLiteral {
  return (text: string, pattern: string) => bool(X.matches(text, pattern));
}
function regex3(): (text: string, pattern: string, flags: string) => E.BooleanLiteral {
  return (text: string, pattern: string, flags: string) => bool(X.matches(text, pattern, flags));
}
/**
 * https://www.w3.org/TR/sparql11-query/#func-regex
 */
class REGEX extends RegularFunction {
  protected arity = [ 2, 3 ];
  public operator = C.RegularOperator.REGEX;

  protected overloads = declare(C.RegularOperator.REGEX)
    .onBinaryTyped([ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ], regex2)
    .onTernaryTyped([ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING, TypeURL.XSD_STRING ], regex3)
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-replace
 */
class REPLACE extends RegularFunction {
  protected arity = [ 3, 4 ];
  public operator = C.RegularOperator.REPLACE;

  protected overloads = declare(C.RegularOperator.REPLACE)
    .onTernaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg: string, pattern: string, replacement: string) =>
        string(X.replace(arg, pattern, replacement)),
    )
    .set(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => ([ arg, pattern, replacement ]: [E.LangStringLiteral, E.StringLiteral, E.StringLiteral]) => {
        const result = X.replace(arg.typedValue, pattern.typedValue, replacement.typedValue);
        return langString(result, arg.language);
      },
    )
    .onQuaternaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg: string, pattern: string, replacement: string, flags: string) =>
        string(X.replace(arg, pattern, replacement, flags)),
    )
    .set(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => ([ arg, pattern, replacement, flags ]:
      [E.LangStringLiteral, E.StringLiteral, E.StringLiteral, E.StringLiteral]) => {
        const result = X.replace(arg.typedValue, pattern.typedValue, replacement.typedValue, flags.typedValue);
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
  public operator = C.RegularOperator.ABS;

  protected overloads = declare(C.RegularOperator.ABS)
    .numericConverter(() => num => Math.abs(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-round
 */
class Round extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.ROUND;

  protected overloads = declare(C.RegularOperator.ROUND)
    .numericConverter(() => num => Math.round(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-ceil
 */
class Ceil extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.CEIL;

  protected overloads = declare(C.RegularOperator.CEIL)
    .numericConverter(() => num => Math.ceil(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-floor
 */
class Floor extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.FLOOR;

  protected overloads = declare(C.RegularOperator.FLOOR)
    .numericConverter(() => num => Math.floor(num))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#idp2130040
 */
class Rand extends RegularFunction {
  protected arity = 0;
  public operator = C.RegularOperator.RAND;

  protected overloads = declare(C.RegularOperator.RAND)
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
  public operator = C.RegularOperator.NOW;

  protected overloads = declare(C.RegularOperator.NOW).set([], exprEval => () =>
    new E.DateTimeLiteral(toDateTimeRepresentation({
      date: exprEval.context.getSafe(KeysInitQuery.queryTimestamp),
      timeZone: exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
    }))).collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-year
 */
class Year extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.YEAR;

  protected overloads = declare(C.RegularOperator.YEAR)
    .onDateTime1(
      () => date => integer(date.typedValue.year),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [E.DateLiteral ]) => integer(date.typedValue.year))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-month
 */
class Month extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.MONTH;

  protected overloads = declare(C.RegularOperator.MONTH)
    .onDateTime1(
      () => date => integer(date.typedValue.month),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [ E.DateLiteral]) => integer(date.typedValue.month))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-day
 */
class Day extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.DAY;

  protected overloads = declare(C.RegularOperator.DAY)
    .onDateTime1(
      () => date => integer(date.typedValue.day),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [ E.DateLiteral]) => integer(date.typedValue.day))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-hours
 */
class Hours extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.HOURS;

  protected overloads = declare(C.RegularOperator.HOURS)
    .onDateTime1(
      () => date => integer(date.typedValue.hours),
    )
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ E.TimeLiteral]) => integer(time.typedValue.hours))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-minutes
 */
class Minutes extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.MINUTES;

  protected overloads = declare(C.RegularOperator.MINUTES)
    .onDateTime1(() => date => integer(date.typedValue.minutes))
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ E.TimeLiteral]) => integer(time.typedValue.minutes))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-seconds
 */
class Seconds extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.SECONDS;

  protected overloads = declare(C.RegularOperator.SECONDS)
    .onDateTime1(() => date => decimal(date.typedValue.seconds))
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ E.TimeLiteral]) => integer(time.typedValue.seconds))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-timezone
 */
class Timezone extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.TIMEZONE;

  protected overloads = declare(C.RegularOperator.TIMEZONE)
    .onDateTime1(
      () => (date) => {
        const duration: Partial<IDayTimeDurationRepresentation> = {
          hours: date.typedValue.zoneHours,
          minutes: date.typedValue.zoneMinutes,
        };
        if (duration.hours === undefined && duration.minutes === undefined) {
          throw new Err.InvalidTimezoneCall(date.str());
        }
        return new E.DayTimeDurationLiteral(duration);
      },
    )
    .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_DATE ]})
    .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_TIME ]})
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-tz
 */
class TZ extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.TZ;

  protected overloads = declare(C.RegularOperator.TZ)
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
class MD5 extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.MD5;

  protected overloads = declare(C.RegularOperator.MD5)
    .onString1Typed(() => str => string(md5(str)))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha1
 */
class SHA1 extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.SHA1;

  protected overloads = declare(C.RegularOperator.SHA1)
    .onString1Typed(() => str => string(sha1().update(str).digest('hex')))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha256
 */
class SHA256 extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.SHA256;

  protected overloads = declare(C.RegularOperator.SHA256)
    .onString1Typed(() => str => string(sha256().update(str).digest('hex')))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha384
 */
class SHA384 extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.SHA384;

  protected overloads = declare(C.RegularOperator.SHA384)
    .onString1Typed(() => str => string(sha384().update(str).digest('hex')))
    .collect();
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha512
 */
class SHA512 extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.SHA512;

  protected overloads = declare(C.RegularOperator.SHA512)
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
  public operator = C.RegularOperator.TRIPLE;

  protected overloads = declare(C.RegularOperator.TRIPLE)
    .onTerm3(
      _ => (...args) => new E.Quad(
        args[0],
        args[1],
        args[2],
        new E.DefaultGraph(),
      ),
    )
    .collect();
}

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#subject
 */
class Subject extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.SUBJECT;

  protected overloads = declare(C.RegularOperator.SUBJECT)
    .onQuad1(() => quad => quad.subject)
    .collect();
}

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#predicate
 */
class Predicate extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.PREDICATE;

  protected overloads = declare(C.RegularOperator.PREDICATE)
    .onQuad1(() => quad => quad.predicate)
    .collect();
}

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#object
 */
class ObjectSparqlFunction extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.OBJECT;

  protected overloads = declare(C.RegularOperator.OBJECT)
    .onQuad1(() => quad => quad.object)
    .collect();
}

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#istriple
 */
class Istriple extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.IS_TRIPLE;

  protected overloads = declare(C.RegularOperator.IS_TRIPLE)
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
export const regularFunctions: Record<C.RegularOperator, RegularFunction> = {
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
  isiri: new IsIRI(),
  isuri: new IsIRI(),
  isblank: new IsBlank(),
  isliteral: new IsLiteral(),
  isnumeric: new IsNumeric(),
  str: new STR(),
  lang: new Lang(),
  datatype: new Datatype(),
  iri: new IRI(),
  uri: new IRI(),
  // 'BNODE': BNODE (see special operators),
  strdt: new STRDT(),
  strlang: new STRLANG(),
  uuid: new UUID(),
  struuid: new STRUUID(),

  // --------------------------------------------------------------------------
  // Functions on strings
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // --------------------------------------------------------------------------
  strlen: new STRLEN(),
  substr: new SUBSTR(),
  ucase: new UCASE(),
  lcase: new LCASE(),
  strstarts: new STRSTARTS(),
  strends: new STRENDS(),
  contains: new CONTAINS(),
  strbefore: new STRBEFORE(),
  strafter: new STRAFTER(),
  encode_for_uri: new ENCODE_FOR_URI(),
  // 'concat': CONCAT (see special operators)
  langmatches: new Langmatches(),
  regex: new REGEX(),
  replace: new REPLACE(),

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
  tz: new TZ(),

  // --------------------------------------------------------------------------
  // Hash functions
  // https://www.w3.org/TR/sparql11-query/#func-hash
  // --------------------------------------------------------------------------
  md5: new MD5(),
  sha1: new SHA1(),
  sha256: new SHA256(),
  sha384: new SHA384(),
  sha512: new SHA512(),

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
  istriple: new Istriple(),
};
