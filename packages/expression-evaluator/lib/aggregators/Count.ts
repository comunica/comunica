import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { integer } from '../functions/Helpers.js';
import { AggregatorComponent } from './Aggregator.js';

export class Count extends AggregatorComponent {
  private state: number | undefined = undefined;
  public static override emptyValue(dataFactory: ComunicaDataFactory): RDF.Term {
    return integer(0).toRDF(dataFactory);
  }

  public put(): void {
    if (this.state === undefined) {
      this.state = 0;
    }
    this.state++;
  }

  public result(): RDF.Term {
    if (this.state === undefined) {
      return Count.emptyValue(this.sharedContext.dataFactory);
    }
    return integer(this.state).toRDF(this.sharedContext.dataFactory);
  }
}
