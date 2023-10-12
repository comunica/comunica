import type { ExpressionEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator } from '@comunica/expression-evaluator';
import type { IActionContext, IBindingsAggregator, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

export class MaxAggregator extends AggregateEvaluator implements IBindingsAggregator {
  private state: RDF.Term | undefined = undefined;
  public constructor(aggregateExpression: Algebra.AggregateExpression,
    expressionEvaluatorFactory: IExpressionEvaluatorFactory, context: IActionContext,
    throwError?: boolean) {
    super(aggregateExpression, expressionEvaluatorFactory, context, throwError);
  }

  public putTerm(term: RDF.Term): void {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a literal`);
    }
    if (this.state === undefined) {
      this.state = term;
    } else if ((<ExpressionEvaluator> this.evaluator).orderTypes(this.state, term) === -1) {
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
