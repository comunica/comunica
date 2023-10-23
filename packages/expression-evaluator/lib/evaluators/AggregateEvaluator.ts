import type { IActionContext, IExpressionEvaluator, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import * as RdfString from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';
import type * as E from '../expressions';
import { TermTransformer } from '../transformers/TermTransformer';
import { TypeAlias } from '../util/Consts';
import { EmptyAggregateError } from '../util/Errors';
import { isSubTypeOf } from '../util/TypeHandling';
import type { ExpressionEvaluator } from './ExpressionEvaluator';

/**
 * This is the base class for all aggregators.
 * NOTE: The wildcard count aggregator significantly differs from the others and overloads parts of this class.
 */
export abstract class AggregateEvaluator {
  protected readonly evaluator: IExpressionEvaluator;
  private readonly throwError: boolean;
  private errorOccurred = false;

  protected readonly distinct: boolean;
  protected readonly variableValues: Set<string>;

  protected constructor(aggregateExpression: Algebra.AggregateExpression,
    expressionEvaluatorFactory: IExpressionEvaluatorFactory, context: IActionContext,
    throwError?: boolean) {
    this.evaluator = expressionEvaluatorFactory.createEvaluator(aggregateExpression.expression, context);
    this.throwError = throwError || false;
    this.errorOccurred = false;

    this.distinct = aggregateExpression.distinct;
    this.variableValues = new Set();
  }

  protected abstract putTerm(term: RDF.Term): void;
  protected abstract termResult(): RDF.Term | undefined;

  public emptyValueTerm(): RDF.Term | undefined {
    return undefined;
  }

  /**
   * The spec says to throw an error when a set function is called on an empty
   * set (unless explicitly mentioned otherwise like COUNT).
   * However, aggregate error handling says to not bind the result in case of an
   * error. So to simplify logic in the caller, we return undefined by default.
   */
  public emptyValue(): RDF.Term | undefined {
    const val = this.emptyValueTerm();
    if (val === undefined && this.throwError) {
      throw new EmptyAggregateError();
    }
    return val;
  }

  /**
   * Base implementation of putBindings, that evaluates to a term and then calls putTerm.
   * The WildcardCountAggregator will completely discard this implementation.
   * @param bindings
   */
  public async putBindings(bindings: RDF.Bindings): Promise<void> {
    if (this.errorOccurred) {
      return;
    }
    try {
      const term = await this.evaluator.evaluate(bindings);
      if (!term || this.errorOccurred) {
        return;
      }

      // Handle DISTINCT before putting the term
      if (!this.distinct || !this.variableValues.has(RdfString.termToString(term))) {
        this.putTerm(term);
        if (this.distinct) {
          this.variableValues.add(RdfString.termToString(term));
        }
      }
    } catch (error: unknown) {
      this.safeThrow(error);
    }
  }

  public async result(): Promise<RDF.Term | undefined> {
    if (this.errorOccurred) {
      return undefined;
    }
    return this.termResult();
  }

  private safeThrow(err: unknown): void {
    if (this.throwError) {
      throw err;
    } else {
      this.errorOccurred = true;
    }
  }

  protected termToNumericOrError(term: RDF.Term): E.NumericLiteral {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    } else if (
      !isSubTypeOf(term.datatype.value, TypeAlias.SPARQL_NUMERIC, (<ExpressionEvaluator> this.evaluator)
        .superTypeProvider)
    ) {
      throw new Error(`Term datatype ${term.datatype.value} with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    }
    return <E.NumericLiteral> new TermTransformer((
      <ExpressionEvaluator> this.evaluator).superTypeProvider).transformLiteral(term);
  }
}
