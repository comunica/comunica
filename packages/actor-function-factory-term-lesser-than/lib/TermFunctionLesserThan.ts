import type { ITermFunction } from '@comunica/bus-function-factory';
import { TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { IInternalEvaluator } from '@comunica/types';
import type {
  BooleanLiteral,
  Term,
  DayTimeDurationLiteral,
  Quad,
  TimeLiteral,
  YearMonthDurationLiteral,
  LangStringLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  dayTimeDurationsToSeconds,
  declare,
  defaultedDateTimeRepresentation,
  defaultedDayTimeDurationRepresentation,
  defaultedYearMonthDurationRepresentation,
  SparqlOperator,
  toUTCDate,
  TypeURL,
  yearMonthDurationsToMonths,
} from '@comunica/utils-expression-evaluator';
import type * as RDF from '@rdfjs/types';

export class TermFunctionLesserThan extends TermFunctionBase {
  public constructor(private readonly equalityFunction: ITermFunction) {
    super({
      arity: 2,
      operator: SparqlOperator.LT,
      overloads: declare(SparqlOperator.LT)
        .numberTest(() => (left, right) => left < right)
        .stringTest(() => (left, right) => left.localeCompare(right) === -1)
        .set(
          [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
          () => ([ left, right ]: LangStringLiteral[]) => {
            if (left.str() !== right.str()) {
              return bool(left.str() < right.str());
            }
            return bool(left.language < right.language);
          },
        )
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
        ).set(
          [ 'term', 'term' ],
          exprEval => ([ left, right ]: [Term, Term]): BooleanLiteral => {
            const termA = left.toRDF(exprEval.context.getSafe(KeysInitQuery.dataFactory));
            const termB = right.toRDF(exprEval.context.getSafe(KeysInitQuery.dataFactory));

            return bool(this.lesserThanTerms(termA, termB));
          },
        )
        .collect(),
    });
  }

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

  private lesserThanTerms(termA: RDF.Term, termB: RDF.Term): boolean {
    // Order different types according to a priority mapping
    if (termA.termType !== termB.termType) {
      return this._TERM_ORDERING_PRIORITY[termA.termType] < this._TERM_ORDERING_PRIORITY[termB.termType];
    }

    return termA.value.localeCompare(termB.value) === -1;
  }

  // SPARQL specifies that blankNode < namedNode < literal. Sparql star expands with < quads and we say < defaultGraph
  private readonly _TERM_ORDERING_PRIORITY = {
    Variable: 0,
    BlankNode: 1,
    NamedNode: 2,
    Literal: 3,
    Quad: 4,
    DefaultGraph: 5,
  };
}
