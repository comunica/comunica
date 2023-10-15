import { AggregateEvaluator, TypeURL } from '@comunica/expression-evaluator';
import type { IActionContext, IBindingsAggregator, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
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
    return new DataFactory().literal('', TypeURL.XSD_STRING);
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
    return new DataFactory().literal(this.state, TypeURL.XSD_STRING);
  }
}
