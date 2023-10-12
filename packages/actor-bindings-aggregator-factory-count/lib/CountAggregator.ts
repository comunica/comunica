import { AggregateEvaluator } from '@comunica/expression-evaluator';
import { integer } from '@comunica/expression-evaluator/lib/functions/Helpers';
import type { IActionContext, IBindingsAggregator, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

export class CountAggregator extends AggregateEvaluator implements IBindingsAggregator {
  private state: number | undefined = undefined;
  public constructor(aggregateExpression: Algebra.AggregateExpression,
    expressionEvaluatorFactory: IExpressionEvaluatorFactory, context: IActionContext,
    throwError?: boolean) {
    super(aggregateExpression, expressionEvaluatorFactory, context, throwError);
  }

  public emptyValueTerm(): RDF.Term {
    return integer(0).toRDF();
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
    return integer(this.state).toRDF();
  }
}
