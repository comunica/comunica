import { AggregateEvaluator } from '@comunica/expression-evaluator';
import { integer } from '@comunica/expression-evaluator/lib/functions/Helpers';
import type { IActionContext, IBindingsAggregator, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import * as RdfString from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';

export class WildcardCountAggregator extends AggregateEvaluator implements IBindingsAggregator {
  // Key: string representation of a ',' separated list of terms.
  // Valyue: string representation of a ',' separated list of variables sorted by name.
  private readonly bindingValues: Map<string, Set<string>> = new Map();
  private state = 0;

  public constructor(aggregateExpression: Algebra.AggregateExpression,
    expressionEvaluatorFactory: IExpressionEvaluatorFactory, context: IActionContext,
    throwError?: boolean) {
    super(aggregateExpression, expressionEvaluatorFactory, context, throwError);
  }

  public putTerm(term: RDF.Term): void {
    // Do nothing, not needed
  }

  public async putBindings(bindings: RDF.Bindings): Promise<void> {
    if (!this.handleDistinct(bindings)) {
      this.state += 1;
    }
  }

  public emptyValueTerm(): RDF.Term {
    return integer(0).toRDF();
  }

  public termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return integer(this.state).toRDF();
  }

  /**
   * Returns true if the given bindings should be skipped.
   * @param bindings
   * @private
   */
  private handleDistinct(bindings: RDF.Bindings): boolean {
    if (this.distinct) {
      const bindingList: [RDF.Variable, RDF.Term][] = [ ...bindings ];
      bindingList.sort((first, snd) => first[0].value.localeCompare(snd[0].value));
      const variables = bindingList.map(([ variable ]) => variable.value).join(',');
      const terms = bindingList.map(([ , term ]) => RdfString.termToString(term)).join(',');

      const set = this.bindingValues.get(variables);
      const result = set !== undefined && set.has(terms);

      // Add to the set:
      if (!set) {
        this.bindingValues.set(variables, new Set());
      }
      this.bindingValues.get(variables)!.add(terms);

      return result;
    }
    return false;
  }
}
