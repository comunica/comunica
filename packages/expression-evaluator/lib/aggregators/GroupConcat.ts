import type * as RDF from '@rdfjs/types';
import { langString, string } from '../functions/Helpers';
import { AggregatorComponent } from './Aggregator';

export class GroupConcat extends AggregatorComponent {
  private state: string | undefined = undefined;
  private lastLanguageValid = true;
  private lastLanguage: string | undefined = undefined;

  public static override emptyValue(): RDF.Term {
    return string('').toRDF();
  }

  public put(term: RDF.Term): void {
    if (this.state === undefined) {
      this.state = term.value;
      if (term.termType === 'Literal') {
        this.lastLanguage = term.language;
      }
    } else {
      this.state += this.separator + term.value;
      if (this.lastLanguageValid && term.termType === 'Literal' && this.lastLanguage !== term.language) {
        this.lastLanguageValid = false;
        this.lastLanguage = undefined;
      }
    }
  }

  public result(): RDF.Term {
    if (this.state === undefined) {
      return GroupConcat.emptyValue();
    }
    if (this.lastLanguageValid && this.lastLanguage) {
      return langString(this.state, this.lastLanguage).toRDF();
    }
    return string(this.state).toRDF();
  }
}
