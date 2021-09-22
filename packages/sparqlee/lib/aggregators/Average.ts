import type * as RDF from '@rdfjs/types';
import * as E from '../expressions';
import { regularFunctions } from '../functions';
import { integer } from '../functions/Helpers';
import * as C from '../util/Consts';
import { BaseAggregator } from './BaseAggregator';

interface IAverageState {
  sum: E.NumericLiteral;
  count: number;
}

export class Average extends BaseAggregator<IAverageState> {
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];
  private readonly divider = regularFunctions[C.RegularOperator.DIVISION];

  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public init(start: RDF.Term): IAverageState {
    const sum = this.termToNumericOrError(start);
    return { sum, count: 1 };
  }

  public put(state: IAverageState, term: RDF.Term): IAverageState {
    const internalTerm = this.termToNumericOrError(term);
    const sum = <E.NumericLiteral> this.summer.apply([ state.sum, internalTerm ], this.sharedContext);
    return {
      sum,
      count: state.count + 1,
    };
  }

  public result(state: IAverageState): RDF.Term {
    const count = new E.IntegerLiteral(state.count);
    const result = this.divider.apply([ state.sum, count ], this.sharedContext);
    return result.toRDF();
  }
}
