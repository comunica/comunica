import type { IBindingsAggregator } from '@comunica/bus-bindings-aggeregator-factory';
import { AggregateEvaluator } from '@comunica/bus-bindings-aggeregator-factory';
import type { ITermComparator } from '@comunica/bus-term-comparator-factory';
import type { IExpressionEvaluator } from '@comunica/expression-evaluator';
import type * as RDF from '@rdfjs/types';

export class MinAggregator extends AggregateEvaluator implements IBindingsAggregator {
  private state: RDF.Term | undefined = undefined;

  public constructor(
    evaluator: IExpressionEvaluator,
    distinct: boolean,
    private readonly orderByEvaluator: ITermComparator,
    throwError?: boolean,
  ) {
    super(evaluator, distinct, throwError);
  }

  public putTerm(term: RDF.Term): void {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a literal`);
    }
    if (this.state === undefined) {
      this.state = term;
    } else if (this.orderByEvaluator.orderTypes(this.state, term) === 1) {
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
