import type { IBindingsAggregator } from '@comunica/bus-bindings-aggeregator-factory';
import { AggregateEvaluator } from '@comunica/bus-bindings-aggeregator-factory';
import type { IExpressionEvaluator } from '@comunica/expression-evaluator';
import { typedLiteral, TypeURL } from '@comunica/expression-evaluator';
import { langString } from '@comunica/expression-evaluator/lib/functions/Helpers';
import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

export class GroupConcatAggregator extends AggregateEvaluator implements IBindingsAggregator {
  private state: string | undefined = undefined;
  private lastLanguageValid = true;
  private lastLanguage: string | undefined = undefined;
  private readonly separator: string;

  public constructor(
    evaluator: IExpressionEvaluator,
    distinct: boolean,
    private readonly dataFactory: ComunicaDataFactory,
    separator?: string,
    throwError?: boolean,
  ) {
    super(evaluator, distinct, throwError);
    this.separator = separator ?? ' ';
  }

  public override emptyValueTerm(): RDF.Term {
    return typedLiteral('', TypeURL.XSD_STRING);
  }

  public putTerm(term: RDF.Term): void {
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

  public termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    if (this.lastLanguageValid && this.lastLanguage) {
      return langString(this.state, this.lastLanguage).toRDF(this.dataFactory);
    }
    return typedLiteral(this.state, TypeURL.XSD_STRING);
  }
}
