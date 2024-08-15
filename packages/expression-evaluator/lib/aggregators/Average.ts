import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import * as E from '../expressions/index.js';
import { integer } from '../functions/Helpers.js';
import { regularFunctions } from '../functions/index.js';
import * as C from '../util/Consts.js';
import { AggregatorComponent } from './Aggregator.js';

interface IAverageState {
  sum: E.NumericLiteral;
  count: number;
}

export class Average extends AggregatorComponent {
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];
  private readonly divider = regularFunctions[C.RegularOperator.DIVISION];
  private state: IAverageState | undefined = undefined;

  public static override emptyValue(dataFactory: ComunicaDataFactory): RDF.Term {
    return integer(0).toRDF(dataFactory);
  }

  public put(term: RDF.Term): void {
    if (this.state === undefined) {
      const sum = this.termToNumericOrError(term);
      this.state = { sum, count: 1 };
    } else {
      const internalTerm = this.termToNumericOrError(term);
      this.state.sum = <E.NumericLiteral> this.summer.apply([ this.state.sum, internalTerm ], this.sharedContext);
      this.state.count++;
    }
  }

  public result(): RDF.Term {
    if (this.state === undefined) {
      return Average.emptyValue(this.sharedContext.dataFactory);
    }
    const count = new E.IntegerLiteral(this.state.count);
    const result = this.divider.apply([ this.state.sum, count ], this.sharedContext);
    return result.toRDF(this.sharedContext.dataFactory);
  }
}
