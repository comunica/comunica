import type { ITermFunction } from '@comunica/bus-function-factory';
import { TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { IInternalEvaluator, TermExpression } from '@comunica/types';
import {
  bool,
  dayTimeDurationsToSeconds,
  declare,
  defaultedDateTimeRepresentation,
  defaultedDayTimeDurationRepresentation,
  defaultedYearMonthDurationRepresentation,
  InvalidArgumentTypes,
  InvalidLexicalForm,
  NonLexicalLiteral,
  nonLexicalComparisonHandler,
  SparqlOperator,
  toUTCDate,
  TypeURL,
  TypeAlias,
  yearMonthDurationsToMonths,
} from '@comunica/utils-expression-evaluator';
import type {
  BooleanLiteral,
  Term,
  Quad,
  BlankNode,
  Literal,
  YearMonthDurationLiteral,
  LangStringLiteral,
  DateTimeLiteral,
  DayTimeDurationLiteral,
  TimeLiteral,
  ISerializable,
} from '@comunica/utils-expression-evaluator';

type Tuple<T> = readonly [T, T];

export class TermFunctionLesserThan extends TermFunctionBase {
  // TODO: remove in next major, as it's unused
  public constructor(private readonly equalityFunction: ITermFunction) {
    super({
      arity: 2,
      operator: SparqlOperator.LT,
      overloads: declare(SparqlOperator.LT)
        .set(
          [ TypeAlias.SPARQL_NUMERIC, TypeAlias.SPARQL_NUMERIC ],
          exprEval => this.compareLiterals(exprEval),
          false,
        )
        // No non-lexical handling for strings, since they can't have invalid lexicals
        .stringTest(() => (left, right) => left.localeCompare(right) === -1)
        .set(
          [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
          exprEval => ([ left, right ]: LangStringLiteral[]) => {
            this.fullTermComparisonCheck(exprEval, left, right);
            if (left.str() === right.str()) {
              return bool(left.language < right.language);
            }
            return bool(left.str() < right.str());
          },
        )
        .set(
          [ TypeURL.XSD_BOOLEAN, TypeURL.XSD_BOOLEAN ],
          exprEval => this.compareLiterals(exprEval),
          false,
        ).set(
          [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ],
          exprEval => this.compareLiterals<DateTimeLiteral>(exprEval, ([ left, right ]) =>
            toUTCDate(left.typedValue, exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone)).getTime() <
              toUTCDate(right.typedValue, exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone)).getTime()),
          false,
        ).copy({
          // https://www.w3.org/TR/xpath-functions/#func-date-less-than
          from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ],
          to: [ TypeURL.XSD_DATE, TypeURL.XSD_DATE ],
        })
        .set(
          [ TypeURL.XSD_YEAR_MONTH_DURATION, TypeURL.XSD_YEAR_MONTH_DURATION ],
          exprEval => this.compareLiterals<YearMonthDurationLiteral>(exprEval, ([ dur1L, dur2L ]) =>
          // https://www.w3.org/TR/xpath-functions/#func-yearMonthDuration-less-than
            yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur1L.typedValue)) <
                yearMonthDurationsToMonths(defaultedYearMonthDurationRepresentation(dur2L.typedValue))),
          false,
        ).set(
          [ TypeURL.XSD_DAY_TIME_DURATION, TypeURL.XSD_DAY_TIME_DURATION ],
          exprEval => this.compareLiterals<DayTimeDurationLiteral>(exprEval, ([ dur1, dur2 ]) =>
          // https://www.w3.org/TR/xpath-functions/#func-dayTimeDuration-greater-than
            dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur1.typedValue)) <
                dayTimeDurationsToSeconds(defaultedDayTimeDurationRepresentation(dur2.typedValue))),
          false,
        )
        .set(
          [ TypeURL.XSD_TIME, TypeURL.XSD_TIME ],
          exprEval => this.compareLiterals<TimeLiteral>(exprEval, ([ time1, time2 ]) =>
          // https://www.w3.org/TR/xpath-functions/#func-time-less-than
            toUTCDate(
              defaultedDateTimeRepresentation(time1.typedValue),
              exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
            ).getTime() <
                toUTCDate(
                  defaultedDateTimeRepresentation(time2.typedValue),
                  exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
                ).getTime()),
          false,
        ).set(
          [ 'quad', 'quad' ],
          exprEval => ([ left, right ]: [Quad, Quad]) => {
            // Test subject, predicate and object with shortcutting. If any comparison errors, this also errors.
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
          exprEval => ([ left, right ]: [Term, Term]): BooleanLiteral =>
            bool(this.lesserThanTerms(left, right, exprEval)),
          false,
        )
        .collect(),
    });
  }

  /**
   * Compare the value of two literals, given a comparator, comparator defaults to JS `<`.
   */
  private compareLiterals<LiteralType extends Literal<ISerializable>>(
    exprEval: IInternalEvaluator,
    comparator: (arg: Tuple<LiteralType>) => boolean = ([ left, right ]) => left.typedValue < right.typedValue,
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
        return nonLexicalCompareResult === -1;
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
      throw new InvalidArgumentTypes([ a, b ], SparqlOperator.LT, `
To enable comparison, set the ${KeysExpressionEvaluator.fullTermComparison.name} flag to true.`);
    }
  }

  private quadComponentTest(left: Term, right: Term, exprEval: IInternalEvaluator): boolean | undefined {
    const componentLess = this.applyOnTerms(
      [ left, right ],
      exprEval,
    );
    if ((<BooleanLiteral>componentLess).typedValue) {
      return true;
    }

    const componentGreater = this.applyOnTerms(
      [ right, left ],
      exprEval,
    );
    if ((<BooleanLiteral>componentGreater).typedValue) {
      return false;
    }

    return undefined;
  }

  private lesserThanTerms(termA: Term, termB: Term, exprEval: IInternalEvaluator): boolean {
    this.fullTermComparisonCheck(exprEval, termA, termB);
    this.nonLexicalCheck(exprEval, termA, termB);

    // Order terms with different types according to a priority mapping
    if (termA.termType !== termB.termType) {
      return this._TERM_ORDERING_PRIORITY[termA.termType] < this._TERM_ORDERING_PRIORITY[termB.termType];
    }

    // Comparison of literals with different or unknown data types: handle non-lexicals and first check dataType
    if (termA.termType === 'literal' && termB.termType === 'literal') {
      const litA = <Literal<ISerializable>> termA;
      const litB = <Literal<ISerializable>> termB;

      const compareType = this.comparePrimitives(litA.dataType, litB.dataType);
      if (compareType !== 0) {
        return compareType === -1;
      }
    }

    return this.comparePrimitives(this.getValue(termA), this.getValue(termB)) === -1;
  }

  private getValue(term: Term): string {
    if (term.termType === 'blankNode') {
      const blankNode = <BlankNode> term;
      if (typeof blankNode.value === 'string') {
        return blankNode.value;
      }
      return blankNode.value.value;
    }
    return term.str();
  }

  private comparePrimitives<T>(valueA: T, valueB: T): -1 | 0 | 1 {
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
