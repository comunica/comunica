import type { IBindingsAggregator } from '@comunica/bus-bindings-aggeregator-factory';
import { AggregateEvaluator } from '@comunica/bus-bindings-aggeregator-factory';
import type { IExpressionEvaluator } from '@comunica/expression-evaluator';
import { typedLiteral, TypeURL } from '@comunica/expression-evaluator';
import type * as RDF from '@rdfjs/types';

export class GroupConcatAggregator extends AggregateEvaluator implements IBindingsAggregator {
  private state: string | undefined = undefined;
  private readonly separator: string;

  public constructor(evaluator: IExpressionEvaluator,
    distinct: boolean,
    separator?: string,
    throwError?: boolean) {
    super(evaluator, distinct, throwError);
    this.separator = separator || ' ';
  }

  public emptyValueTerm(): RDF.Term {
    return typedLiteral('', TypeURL.XSD_STRING);
  }

  public putTerm(term: RDF.Term): void {
    if (this.state === undefined) {
      this.state = term.value;
    } else {
      this.state += this.separator + term.value;
    }
  }

  public termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return typedLiteral(this.state, TypeURL.XSD_STRING);
  }
}
