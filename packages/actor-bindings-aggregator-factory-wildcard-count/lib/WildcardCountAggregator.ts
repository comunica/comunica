import type { IBindingsAggregator } from '@comunica/bus-bindings-aggeregator-factory';
import { AggregateEvaluator } from '@comunica/bus-bindings-aggeregator-factory';
import type { IExpressionEvaluator } from '@comunica/expression-evaluator';
import { typedLiteral, TypeURL } from '@comunica/expression-evaluator';
import type * as RDF from '@rdfjs/types';
import * as RdfString from 'rdf-string';

export class WildcardCountAggregator extends AggregateEvaluator implements IBindingsAggregator {
  private readonly bindingValues: Map<string, Set<string>> = new Map();
  private state: number | undefined = undefined;

  public constructor(evaluator: IExpressionEvaluator, distinct: boolean, throwError?: boolean) {
    super(evaluator, distinct, throwError);
  }

  public putTerm(_term: RDF.Term): void {
    // Do nothing, not needed
  }

  public override async putBindings(bindings: RDF.Bindings): Promise<void> {
    if (!this.handleDistinct(bindings)) {
      if (this.state === undefined) {
        this.state = 0;
      }
      this.state += 1;
    }
  }

  public override emptyValueTerm(): RDF.Term {
    return typedLiteral('0', TypeURL.XSD_INTEGER);
  }

  public termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return typedLiteral(String(this.state), TypeURL.XSD_INTEGER);
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
