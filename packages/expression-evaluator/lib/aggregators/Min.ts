import type * as RDF from '@rdfjs/types';
import { orderTypes } from '../util/Ordering.js';
import { AggregatorComponent } from './Aggregator.js';

export class Min extends AggregatorComponent {
  private state: RDF.Term | undefined = undefined;

  public put(term: RDF.Term): void {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a literal`);
    }
    if (this.state === undefined) {
      this.state = term;
    } else if (orderTypes(this.state, term, this.sharedContext.dataFactory) === 1) {
      this.state = term;
    }
  }

  public result(): RDF.Term | undefined {
    if (this.state === undefined) {
      return Min.emptyValue(this.sharedContext.dataFactory);
    }
    return this.state;
  }
}
