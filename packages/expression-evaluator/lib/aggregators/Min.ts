import type * as RDF from '@rdfjs/types';
import { AggregateEvaluator } from '../evaluators/AggregateEvaluator';
import { orderTypes } from '../util/Ordering';
import { Algebra } from 'sparqlalgebrajs';
import { AsyncEvaluator } from '../evaluators/AsyncEvaluator';

export class Min extends AggregateEvaluator {
  private state: RDF.Term | undefined = undefined;
  public constructor(expr: Algebra.AggregateExpression,
    evaluator: AsyncEvaluator, throwError?: boolean) {
    super(expr, evaluator, throwError);
  }

  public putTerm(term: RDF.Term): void {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a literal`);
    }
    if (this.state === undefined) {
      this.state = term;
    } else if (orderTypes(this.state, term) === 1) {
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
