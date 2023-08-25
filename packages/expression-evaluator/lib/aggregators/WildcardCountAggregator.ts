import type * as RDF from '@rdfjs/types';
import * as RdfString from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';
import { integer } from '../functions/Helpers';

/**
 * Implementation of the COUNT aggregator on a wildcard.
 * We choose to make this is separate class, because it would pollute the code of the other aggregators.
 */
export class WildcardCountAggregator {
  private readonly distinct: boolean;

  // Key: string representation of a ',' separated list of terms.
  // Value: string representation of a ',' separated list of variables sorted by name.
  private readonly bindingValues: Map<string, Set<string>> = new Map();
  private counter = 0;

  public constructor(expr: Algebra.AggregateExpression) {
    this.distinct = expr.distinct;
  }

  public putBindings(bindings: RDF.Bindings): void {
    if (!this.handleDistinct(bindings)) {
      this.counter += 1;
    }
  }

  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public result(): RDF.Term {
    return integer(this.counter).toRDF();
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
