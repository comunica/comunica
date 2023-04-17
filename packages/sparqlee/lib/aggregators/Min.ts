import type * as RDF from '@rdfjs/types';
import { AggregatorComponent } from './Aggregator';

interface IExtremeState {
  extremeValue: number; term: RDF.Term;
}
export class Min extends AggregatorComponent {
  private state: IExtremeState | undefined = undefined;

  public put(term: RDF.Term): void {
    if (this.state === undefined) {
      const { value } = this.extractValue(term);
      this.state = { extremeValue: value, term };
    } else {
      const extracted = this.extractValue(term);
      if (extracted.value < this.state.extremeValue) {
        this.state = {
          extremeValue: extracted.value,
          term,
        };
      }
    }
  }

  public result(): RDF.Term | undefined {
    if (this.state === undefined) {
      return Min.emptyValue();
    }
    return this.state.term;
  }
}
