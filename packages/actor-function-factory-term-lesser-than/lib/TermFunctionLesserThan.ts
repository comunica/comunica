import type { ITermFunction } from '@comunica/bus-function-factory';
import { TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { IInternalEvaluator } from '@comunica/types';
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
import type {
  BooleanLiteral,
  Term,
  DayTimeDurationLiteral,
  Quad,
  BlankNode,
  Literal,
  TimeLiteral,
  YearMonthDurationLiteral,
  LangStringLiteral,
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
          () => ([ left, right ]: [Term, Term]): BooleanLiteral => bool(this.lesserThanTerms(left, right)),
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

  private lesserThanTerms(termA: Term, termB: Term): boolean {
    // Order different types according to a priority mapping
    if (termA.termType !== termB.termType) {
      return this._TERM_ORDERING_PRIORITY[termA.termType] < this._TERM_ORDERING_PRIORITY[termB.termType];
    }

    // If both are literals, try compare data type first
    if (termA.termType === 'literal' && termB.termType === 'literal') {
      const compareType =
        this.comparePrimitives((<Literal<any>> termA).dataType, (<Literal<any>> termB).dataType);
      if (compareType !== 0) {
        return compareType === -1;
      }
    }

    return this.comparePrimitives(this.getValue(termA), this.getValue(termB)) === -1;
  }

  private getValue(term: Term): string {
    if (term.termType === 'blankNode') {
      if (typeof (<BlankNode> term).value === 'string') {
        return <string> (<BlankNode> term).value;
      }
      return (<RDF.BlankNode> (<BlankNode> term).value).value;
    }
    return term.str();
  }

  private comparePrimitives(valueA: any, valueB: any): -1 | 0 | 1 {
    return valueA === valueB ? 0 : (valueA < valueB ? -1 : 1);
  }

  // SPARQL specifies that blankNode < namedNode < literal. Sparql star expands with < quads and we say < defaultGraph:
  // https://www.w3.org/TR/sparql11-query/#modOrderBy
  private readonly _TERM_ORDERING_PRIORITY = {
    blankNode: 0,
    namedNode: 1,
    literal: 2,
    quad: 3,
    defaultGraph: 4,
  };
}
