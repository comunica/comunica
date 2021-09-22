import type * as RDF from '@rdfjs/types';
import { BaseAggregator } from './BaseAggregator';

export class Sample extends BaseAggregator<RDF.Term> {
  public init(start: RDF.Term): RDF.Term {
    return start;
  }

  public put(state: RDF.Term, term: RDF.Term): RDF.Term {
    // First value is our sample
    return state;
  }

  public result(state: RDF.Term): RDF.Term {
    return state;
  }
}
