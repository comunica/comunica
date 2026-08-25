import { TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { IInternalEvaluator, TermExpression } from '@comunica/types';
import type {
  BooleanLiteral,
  DateTimeLiteral,
  DurationLiteral,
  ISerializable,
  LangStringLiteral,
  Literal,
  Quad,
  TimeLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  dayTimeDurationsToSeconds,
  declare,
  defaultedDateTimeRepresentation,
  defaultedDayTimeDurationRepresentation,
  defaultedYearMonthDurationRepresentation,
  InvalidLexicalForm,
  nonLexicalComparisonHandler,
  NonLexicalLiteral,
  RDFEqualTypeError,
  SparqlOperator,
  toUTCDate,
  TypeAlias,
  TypeURL,
  yearMonthDurationsToMonths,
} from '@comunica/utils-expression-evaluator';

type Tuple<T> = readonly [T, T];

/**
 * https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
 */
export class TermFunctionEquality extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.EQUAL,
      overloads: declare(SparqlOperator.EQUAL)
        .set(
          [ TypeAlias.SPARQL_NUMERIC, TypeAlias.SPARQL_NUMERIC ],
          exprEval => this.literalEquality(exprEval),
          false,
        )
        .stringTest(() => (left, right) => left.localeCompare(right) === 0)
        .set(
          [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
          () => ([ left, right ]: LangStringLiteral[]) => bool(left.str() === right.str() &&
        left.language === right.language),
        )
        // Fall through: a TypeURL.XSD_STRING is never equal to a TypeURL.RDF_LANG_STRING.
        .set([ TypeAlias.SPARQL_STRINGLY, TypeAlias.SPARQL_STRINGLY ], () => () => bool(false))
        .set(
          [ TypeURL.XSD_BOOLEAN, TypeURL.XSD_BOOLEAN ],
          exprEval => this.literalEquality(exprEval),
          false,
        )
        .set(
          [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ],
          exprEval => this.literalEquality<DateTimeLiteral>(exprEval, ([ left, right ]) =>
            toUTCDate(left.typedValue, exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone)).getTime() ===
              toUTCDate(right.typedValue, exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone)).getTime()),
          false,
        )
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
              this.fullTermComparisonCheck(exprEval, _left, _right);
              // Throw if any are nonLexical, unless when it is allowed.
              this.nonLexicalCheck(exprEval, _left, _right);
              return bool(false);
            }
            return bool(val);
          },
          false,
        )
        .set(
          [ TypeURL.XSD_DURATION, TypeURL.XSD_DURATION ],
          exprEval => this.literalEquality<DurationLiteral>(exprEval, ([ dur1, dur2 ]) =>
            yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur1.typedValue)) ===
            yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur2.typedValue)) &&
            dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur1.typedValue)) ===
            dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur2.typedValue))),
          false,
        ).set(
          [ TypeURL.XSD_TIME, TypeURL.XSD_TIME ],
          exprEval => this.literalEquality<TimeLiteral>(exprEval, ([ time1, time2 ]) =>
            // https://www.w3.org/TR/xpath-functions/#func-time-equal
            toUTCDate(
              defaultedDateTimeRepresentation(time1.typedValue),
              exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
            ).getTime() ===
            toUTCDate(
              defaultedDateTimeRepresentation(time2.typedValue),
              exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
            ).getTime()),
          false,
        ).collect(),
    });
  }

  /**
   * Compare the value of two literals, given a comparator, comparator defaults to JS `=`.
   */
  private literalEquality<LiteralType extends Literal<ISerializable>>(
    exprEval: IInternalEvaluator,
    comparator: (arg: Tuple<LiteralType>) => boolean = ([ left, right ]) => left.typedValue === right.typedValue,
  ): ([ left, right ]: Tuple<LiteralType>) => BooleanLiteral {
    return (args: Tuple<LiteralType>) => bool(this.nonLexicalWrapper<LiteralType>(
      exprEval,
      comparator,
    )(args));
  }

  private nonLexicalWrapper<LiteralType extends Literal<ISerializable>>(
    exprEval: IInternalEvaluator,
    comparator: (args: Tuple<LiteralType>) => boolean,
  ): (args: Tuple<LiteralType>) => boolean {
    return ([ left, right ]: Tuple<LiteralType>) => {
      const nonLexicalCompareResult = nonLexicalComparisonHandler(exprEval, left, right);
      if (nonLexicalCompareResult !== undefined) {
        return nonLexicalCompareResult === 0;
      }
      return comparator([ left, right ]);
    };
  }

  private nonLexicalCheck(exprEval: IInternalEvaluator, a: TermExpression, b: TermExpression): void {
    const nonLexical = [ a, b ].find(arg => arg instanceof NonLexicalLiteral);
    if (nonLexical && !exprEval.context.get(KeysExpressionEvaluator.nonLexicalComparison)) {
      throw new InvalidLexicalForm(
        nonLexical.toRDF(exprEval.context.getSafe(KeysInitQuery.dataFactory)),
      );
    }
  }

  private fullTermComparisonCheck(exprEval: IInternalEvaluator, a: TermExpression, b: TermExpression): void {
    if (!exprEval.context.get(KeysExpressionEvaluator.fullTermComparison)) {
      throw new RDFEqualTypeError([ a, b ]);
    }
  }
}
