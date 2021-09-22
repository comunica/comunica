import type * as RDF from '@rdfjs/types';
import { string } from '../functions/Helpers';
import { BaseAggregator } from './BaseAggregator';

export class GroupConcat extends BaseAggregator<string> {
  public static emptyValue(): RDF.Term {
    return string('').toRDF();
  }

  public init(start: RDF.Term): string {
    return start.value;
  }

  public put(state: string, term: RDF.Term): string {
    return state + this.separator + term.value;
  }

  public result(state: string): RDF.Term {
    return string(state).toRDF();
  }
}
