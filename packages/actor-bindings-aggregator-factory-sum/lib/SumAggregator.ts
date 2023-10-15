import type { ExpressionEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator, RegularOperator, TypeURL } from '@comunica/expression-evaluator';
import type * as E from '@comunica/expression-evaluator/lib/expressions';
import { regularFunctions } from '@comunica/expression-evaluator/lib/functions';
import type { IActionContext, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';

type SumState = E.NumericLiteral;

export class SumAggregator extends AggregateEvaluator {
  private state: SumState | undefined = undefined;
  private readonly summer = regularFunctions[RegularOperator.ADDITION];

  public constructor(aggregateExpression: Algebra.AggregateExpression,
    expressionEvaluatorFactory: IExpressionEvaluatorFactory, context: IActionContext,
    throwError?: boolean) {
    super(aggregateExpression, expressionEvaluatorFactory, context, throwError);
  }

  public emptyValueTerm(): RDF.Term {
    return new DataFactory().literal('0', TypeURL.XSD_INT);
  }

  public putTerm(term: RDF.Term): void {
    if (this.state === undefined) {
      this.state = this.termToNumericOrError(term);
    } else {
      const internalTerm = this.termToNumericOrError(term);
      this.state = <E.NumericLiteral> this.summer.apply([ this.state, internalTerm ],
        <ExpressionEvaluator> this.evaluator);
    }
  }

  public termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return this.state.toRDF();
  }
}
