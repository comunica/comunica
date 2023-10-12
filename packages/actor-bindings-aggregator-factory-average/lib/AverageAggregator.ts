import type { ExpressionEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator } from '@comunica/expression-evaluator';
import * as E from '@comunica/expression-evaluator/lib/expressions';
import { regularFunctions } from '@comunica/expression-evaluator/lib/functions';
import { integer } from '@comunica/expression-evaluator/lib/functions/Helpers';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';
import type { IActionContext, IExpressionEvaluatorFactory, IBindingsAggregator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

interface IAverageState {
  sum: E.NumericLiteral;
  count: number;
}

export class AverageAggregator extends AggregateEvaluator implements IBindingsAggregator {
  // This will eventually be a mediator call.
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];
  private readonly divider = regularFunctions[C.RegularOperator.DIVISION];
  private state: IAverageState | undefined = undefined;

  public constructor(aggregateExpression: Algebra.AggregateExpression,
    expressionEvaluatorFactory: IExpressionEvaluatorFactory, context: IActionContext,
    throwError?: boolean) {
    super(aggregateExpression, expressionEvaluatorFactory, context, throwError);
  }

  public emptyValueTerm(): RDF.Term {
    return integer(0).toRDF();
  }

  public putTerm(term: RDF.Term): void {
    if (this.state === undefined) {
      const sum = this.termToNumericOrError(term);
      this.state = { sum, count: 1 };
    } else {
      const internalTerm = this.termToNumericOrError(term);
      this.state.sum = <E.NumericLiteral> this.summer.apply([ this.state.sum, internalTerm ],
        <ExpressionEvaluator> this.evaluator);
      this.state.count++;
    }
  }

  public termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    const count = new E.IntegerLiteral(this.state.count);
    const result = this.divider.apply([ this.state.sum, count ], <ExpressionEvaluator> this.evaluator);
    return result.toRDF();
  }
}
