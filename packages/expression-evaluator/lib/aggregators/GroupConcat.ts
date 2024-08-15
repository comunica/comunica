import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { langString, string } from '../functions/Helpers.js';
import { AggregatorComponent } from './Aggregator.js';

export class GroupConcat extends AggregatorComponent {
  private state: string | undefined = undefined;
  private lastLanguageValid = true;
  private lastLanguage: string | undefined = undefined;

  public static override emptyValue(dataFactory: ComunicaDataFactory): RDF.Term {
    return string('').toRDF(dataFactory);
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
      return GroupConcat.emptyValue(this.sharedContext.dataFactory);
    }
    if (this.lastLanguageValid && this.lastLanguage) {
      return langString(this.state, this.lastLanguage).toRDF(this.sharedContext.dataFactory);
    }
    return string(this.state).toRDF(this.sharedContext.dataFactory);
  }
}
