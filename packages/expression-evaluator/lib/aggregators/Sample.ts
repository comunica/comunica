import type * as RDF from '@rdfjs/types';
import { AggregatorComponent } from './Aggregator';

export class Sample extends AggregatorComponent {
  private state: RDF.Term | undefined = undefined;

  public put(term: RDF.Term): void {
    // First value is our sample
    if (this.state === undefined) {
      this.state = term;
    }
  }

  public result(): RDF.Term | undefined {
    if (this.state === undefined) {
      return Sample.emptyValue();
    }
    return this.state;
  }
}
