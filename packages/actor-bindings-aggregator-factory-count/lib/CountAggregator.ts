import { AggregateEvaluator, typedLiteral, TypeURL } from '@comunica/expression-evaluator';
import type { IBindingsAggregator, IExpressionEvaluator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

export class CountAggregator extends AggregateEvaluator implements IBindingsAggregator {
  private state: number | undefined = undefined;
  public constructor(evaluator: IExpressionEvaluator, distinct: boolean, throwError?: boolean) {
    super(evaluator, distinct, throwError);
  }

  public emptyValueTerm(): RDF.Term {
    return typedLiteral('0', TypeURL.XSD_INTEGER);
  }

  protected putTerm(_: RDF.Term): void {
    if (this.state === undefined) {
      this.state = 0;
    }
    this.state++;
  }

  protected termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return typedLiteral(String(this.state), TypeURL.XSD_INTEGER);
  }
}
