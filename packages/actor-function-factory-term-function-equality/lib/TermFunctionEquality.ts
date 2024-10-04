import { TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type {
  BooleanLiteral,

  DurationLiteral,
  LangStringLiteral,
  Quad,
  TimeLiteral,
} from '@comunica/expression-evaluator';
import {
  bool,
  dayTimeDurationsToSeconds,
  declare,
  defaultedDateTimeRepresentation,
  defaultedDayTimeDurationRepresentation,
  defaultedYearMonthDurationRepresentation,
  RDFEqualTypeError,
  SparqlOperator,
  toUTCDate,
  TypeAlias,
  TypeURL,
  yearMonthDurationsToMonths,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
 */
export class TermFunctionEquality extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.EQUAL,
      overloads: declare(SparqlOperator.EQUAL)
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
          exprEval => ([ _left, _right ]) => {
            const left = _left.toRDF(exprEval.context.getSafe(KeysInitQuery.dataFactory));
            const right = _right.toRDF(exprEval.context.getSafe(KeysInitQuery.dataFactory));
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
        .collect(),
    });
  }
}
