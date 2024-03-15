import type * as RDF from '@rdfjs/types';
import { string } from '../functions/Helpers';
import { AggregatorComponent } from './Aggregator';

export class GroupConcat extends AggregatorComponent {
  private state: string | undefined = undefined;
  public static emptyValue(): RDF.Term {
    return string('').toRDF();
  }

  public put(term: RDF.Term): void {
    if (this.state === undefined) {
      this.state = term.value;
    } else {
      this.state += this.separator + term.value;
    }
  }

  public result(): RDF.Term {
    if (this.state === undefined) {
      return GroupConcat.emptyValue();
    }
    return string(this.state).toRDF();
  }
}
