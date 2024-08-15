import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type * as E from '../expressions/index.js';
import { integer } from '../functions/Helpers.js';
import { regularFunctions } from '../functions/index.js';
import * as C from '../util/Consts.js';
import { AggregatorComponent } from './Aggregator.js';

type SumState = E.NumericLiteral;

export class Sum extends AggregatorComponent {
  private state: SumState | undefined = undefined;
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];

  public static override emptyValue(dataFactory: ComunicaDataFactory): RDF.Term {
    return integer(0).toRDF(dataFactory);
  }

  public put(term: RDF.Term): void {
    if (this.state === undefined) {
      this.state = this.termToNumericOrError(term);
    } else {
      const internalTerm = this.termToNumericOrError(term);
      this.state = <E.NumericLiteral> this.summer.apply([ this.state, internalTerm ], this.sharedContext);
    }
  }

  public result(): RDF.Term {
    if (this.state === undefined) {
      return Sum.emptyValue(this.sharedContext.dataFactory);
    }
    return this.state.toRDF(this.sharedContext.dataFactory);
  }
}
