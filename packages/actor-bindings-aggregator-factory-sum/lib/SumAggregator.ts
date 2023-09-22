import type { ExpressionEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator } from '@comunica/expression-evaluator';
import type * as E from '@comunica/expression-evaluator/lib/expressions';
import { regularFunctions } from '@comunica/expression-evaluator/lib/functions';
import { integer } from '@comunica/expression-evaluator/lib/functions/Helpers';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';
import type { IActionContext, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

type SumState = E.NumericLiteral;

export class SumAggregator extends AggregateEvaluator {
  private state: SumState | undefined = undefined;
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];

  public constructor(aggregateExpression: Algebra.AggregateExpression,
    expressionEvaluatorFactory: IExpressionEvaluatorFactory, context: IActionContext,
    throwError?: boolean) {
    super(aggregateExpression, expressionEvaluatorFactory, context, throwError);
  }

  public emptyValue(): RDF.Term {
    return integer(0).toRDF();
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

  public termResult(): RDF.Term {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return this.state.toRDF();
  }
}
