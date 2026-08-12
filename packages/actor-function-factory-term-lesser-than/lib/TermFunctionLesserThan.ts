import type { ITermFunction } from '@comunica/bus-function-factory';
import { TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { ActionContextKey } from '@comunica/core';
import type { IInternalEvaluator, TermExpression } from '@comunica/types';
import {
  bool,
  dayTimeDurationsToSeconds,
  declare,
  defaultedDateTimeRepresentation,
  defaultedDayTimeDurationRepresentation,
  defaultedYearMonthDurationRepresentation,
  InvalidArgumentTypes,
  NonLexicalLiteral,
  SparqlOperator,
  toUTCDate,
  TypeURL,
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
import * as C from '@comunica/utils-expression-evaluator/lib/util/Consts';
import * as Err from '@comunica/utils-expression-evaluator/lib/util/Errors';

type Tuple<T> = readonly [T, T];

// TODO: create fullTermComparison wrapper (just like the nonLexicalWrapper)

export class TermFunctionLesserThan extends TermFunctionBase {
  public constructor(private readonly equalityFunction: ITermFunction) {
    super({
      arity: 2,
      operator: SparqlOperator.LT,
      overloads: declare(SparqlOperator.LT)
        .set(
          [ C.TypeAlias.SPARQL_NUMERIC, C.TypeAlias.SPARQL_NUMERIC ],
          exprEval => this.compareLiterals(exprEval),
          false,
        )
        // No non-lexical handling for strings, since they can't have invalid lexicals
        .stringTest(() => (left, right) => left.localeCompare(right) === -1)
        .set(
          [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
          exprEval => ([ left, right ]: LangStringLiteral[]) => {
            this.fullTermComparisonCheck(exprEval, left, right);
            if (left.str() !== right.str()) {
              return bool(left.str() < right.str());
            }
            return bool(left.language < right.language);
          },
        )
        .set(
          [ C.TypeURL.XSD_BOOLEAN, C.TypeURL.XSD_BOOLEAN ],
          exprEval => this.compareLiterals(exprEval),
          false,
        ).set(
          [ C.TypeURL.XSD_DATE_TIME, C.TypeURL.XSD_DATE_TIME ],
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

  private nonLexicalWrapper<LiteralType extends Literal<ISerializable>, ReturnType = boolean>(
    exprEval: IInternalEvaluator,
    comparator: (args: Tuple<LiteralType>) => ReturnType,
  ): (args: Tuple<LiteralType>) => ReturnType | boolean {
    return (args) => {
      const nonLexical = args.find(arg => arg instanceof NonLexicalLiteral);
      if (nonLexical) {
        if (!exprEval.context.get(KeysExpressionEvaluator.nonLexicalComparison)) {
          throw new Err.InvalidLexicalForm(
            nonLexical.toRDF(exprEval.context.getSafe(KeysInitQuery.dataFactory)),
          );
        }
        const [ left, right ] = args;
        return this.comparePrimitives(left.str(), right.str()) === -1;
      }
      return comparator(args);
    };
  }

  private fullTermComparisonCheck(exprEval: IInternalEvaluator, a: TermExpression, b: TermExpression): void {
    if (!exprEval.context.get(KeysExpressionEvaluator.fullTermComparison)) {
      throw new InvalidArgumentTypes([ a, b ], SparqlOperator.LT, `
To enable comparison, set the ${KeysExpressionEvaluator.fullTermComparison.name} flag to true.`);
    }
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

  private lesserThanTerms(termA: Term, termB: Term, exprEval: IInternalEvaluator): boolean {
    this.fullTermComparisonCheck(exprEval, termA, termB);

    // Order terms with different types according to a priority mapping
    if (termA.termType !== termB.termType) {
      return this._TERM_ORDERING_PRIORITY[termA.termType] < this._TERM_ORDERING_PRIORITY[termB.termType];
    }

    // Comparison of literals with different or unknown data types
    if (termA.termType === 'literal' && termB.termType === 'literal') {
      const litA = <Literal<ISerializable>> termA;
      const litB = <Literal<ISerializable>> termB;

      const dataTypesComparison = this.nonLexicalWrapper<Literal<ISerializable>, boolean | undefined>(
        exprEval,
        ([ litA, litB ]) => {
          const compareType =
            this.comparePrimitives(litA.dataType, litB.dataType);
          if (compareType !== 0) {
            return compareType === -1;
          }
        },
      )([ litA, litB ]);

      return dataTypesComparison ?? this.comparePrimitives(this.getValue(termA), this.getValue(termB)) === -1;
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
