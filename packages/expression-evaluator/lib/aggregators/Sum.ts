import type * as RDF from '@rdfjs/types';
import type * as E from '../expressions';
import { regularFunctions } from '../functions';
import { integer } from '../functions/Helpers';
import * as C from '../util/Consts';
import { AggregatorComponent } from './Aggregator';

type SumState = E.NumericLiteral;

export class Sum extends AggregatorComponent {
  private state: SumState | undefined = undefined;
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];

  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
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
      return Sum.emptyValue();
    }
    return this.state.toRDF();
  }
}
