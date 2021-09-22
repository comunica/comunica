import type * as RDF from '@rdfjs/types';
import { BaseAggregator } from './BaseAggregator';

interface IExtremeState {
  extremeValue: number; term: RDF.Literal;
}
export class Max extends BaseAggregator<IExtremeState> {
  public init(start: RDF.Term): IExtremeState {
    const { value } = this.extractValue(start);
    if (start.termType === 'Literal') {
      return { extremeValue: value, term: start };
    }
    throw new Error('Term should be a literal');
  }

  public put(state: IExtremeState, term: RDF.Term): IExtremeState {
    const extracted = this.extractValue(term);
    if (extracted.value > state.extremeValue && term.termType === 'Literal') {
      return {
        extremeValue: extracted.value,
        term,
      };
    }
    return state;
  }

  public result(state: IExtremeState): RDF.Term {
    return state.term;
  }
}
