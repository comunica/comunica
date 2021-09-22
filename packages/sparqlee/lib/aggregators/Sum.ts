import type * as RDF from '@rdfjs/types';
import type * as E from '../expressions';
import { regularFunctions } from '../functions';
import { integer } from '../functions/Helpers';
import * as C from '../util/Consts';
import { BaseAggregator } from './BaseAggregator';

type SumState = E.NumericLiteral;

export class Sum extends BaseAggregator<SumState> {
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];

  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public init(start: RDF.Term): SumState {
    return this.termToNumericOrError(start);
  }

  public put(state: SumState, term: RDF.Term): SumState {
    const internalTerm = this.termToNumericOrError(term);
    const sum = <E.NumericLiteral> this.summer.apply([ state, internalTerm ], this.sharedContext);
    return sum;
  }

  public result(state: SumState): RDF.Term {
    return state.toRDF();
  }
}
