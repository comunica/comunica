import type * as RDF from '@rdfjs/types';
import { integer } from '../functions/Helpers';
import { AggregatorComponent } from './Aggregator';

export class Count extends AggregatorComponent {
  private state: number | undefined = undefined;
  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public put(_: RDF.Term): void {
    if (this.state === undefined) {
      this.state = 0;
    }
    this.state++;
  }

  public result(): RDF.Term {
    if (this.state === undefined) {
      return Count.emptyValue();
    }
    return integer(this.state).toRDF();
  }
}
