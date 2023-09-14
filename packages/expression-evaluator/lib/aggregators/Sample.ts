import type * as RDF from '@rdfjs/types';
import { AggregatorComponent } from './Aggregator';
import {AggregateEvaluator} from "../evaluators/AggregateEvaluator";

export class Sample extends AggregateEvaluator {
  private state: RDF.Term | undefined = undefined;

  public constructor(expr: Algebra.AggregateExpression,
                     evaluator: AsyncEvaluator, throwError?: boolean) {
    super(expr, evaluator, throwError);
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
