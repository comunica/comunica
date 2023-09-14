import type * as RDF from '@rdfjs/types';
import * as RdfString from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';
import type * as E from '../expressions';
import type { ITermTransformer } from '../transformers/TermTransformer';
import { TypeAlias } from '../util/Consts';
import { isSubTypeOf } from '../util/TypeHandling';
import type { AsyncEvaluator } from './AsyncEvaluator';

/**
 * Abstract aggregator actor. This is the base class for all aggregator actors.
 * Only the wildcard count aggregator significantly differs from the others.
 */
export abstract class AggregateEvaluator {
  private readonly expression: Algebra.AggregateExpression;
  private readonly evaluator: AsyncEvaluator;

  private readonly throwError: boolean;
  private errorOccurred = false;

  protected readonly distinct: boolean;
  protected readonly variableValues: Set<string>;

  protected constructor(private readonly expr: Algebra.AggregateExpression,
    evaluator: AsyncEvaluator, throwError?: boolean) {
    this.expression = expr;
    this.evaluator = evaluator;

    this.throwError = throwError || false;
    this.errorOccurred = false;

    this.distinct = expr.distinct;
    this.variableValues = new Set();
  }

  protected abstract putTerm(term: RDF.Term): Promise<void>;
  protected abstract termResult(): RDF.Term;

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
      if (!this.distinct || this.variableValues.has(RdfString.termToString(term))) {
        await this.putTerm(term);
        if (this.distinct) {
          this.variableValues.add(RdfString.termToString(term));
        }
      }
    } catch (error: unknown) {
      this.safeThrow(error);
    }
  }

  public result(): RDF.Term | undefined {
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

  protected termToNumericOrError(termTransformer: ITermTransformer, term: RDF.Term): E.NumericLiteral {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    } else if (
      !isSubTypeOf(term.datatype.value, TypeAlias.SPARQL_NUMERIC, this.context.superTypeProvider)
    ) {
      throw new Error(`Term datatype ${term.datatype.value} with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    }
    return <E.NumericLiteral> termTransformer.transformLiteral(term);
  }
}
