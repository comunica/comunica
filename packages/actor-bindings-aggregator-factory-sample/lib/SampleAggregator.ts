import type { IBindingsAggregator } from '@comunica/bus-bindings-aggeregator-factory';
import { AggregateEvaluator } from '@comunica/bus-bindings-aggeregator-factory';
import type { IExpressionEvaluator } from '@comunica/expression-evaluator';
import type * as RDF from '@rdfjs/types';

export class SampleAggregator extends AggregateEvaluator implements IBindingsAggregator {
  private state: RDF.Term | undefined = undefined;

  public constructor(evaluator: IExpressionEvaluator, distinct: boolean, throwError?: boolean) {
    super(evaluator, distinct, throwError);
  }

  public putTerm(term: RDF.Term): void {
    // First value is our sample
    if (this.state === undefined) {
      this.state = term;
    }
  }

  public termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return this.state;
  }
}
