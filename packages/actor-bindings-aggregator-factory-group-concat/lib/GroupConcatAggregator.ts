import { AggregateEvaluator } from '@comunica/expression-evaluator';
import { string } from '@comunica/expression-evaluator/lib/functions/Helpers';
import type { IActionContext, IBindingsAggregator, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

export class GroupConcatAggregator extends AggregateEvaluator implements IBindingsAggregator {
  private state: string | undefined = undefined;
  private readonly separator: string;

  public constructor(aggregateExpression: Algebra.AggregateExpression,
    expressionEvaluatorFactory: IExpressionEvaluatorFactory, context: IActionContext,
    throwError?: boolean) {
    super(aggregateExpression, expressionEvaluatorFactory, context, throwError);
    this.separator = aggregateExpression.separator || ' ';
  }

  public emptyValueTerm(): RDF.Term {
    return string('').toRDF();
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
    return string(this.state).toRDF();
  }
}
