import type { ITermFunction } from '@comunica/bus-function-factory';
import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#OperatorMapping
 */
export class TermFunctionGreaterThan extends TermFunctionBase {
  public constructor(private readonly lessThanFunction: ITermFunction) {
    super({
      arity: 2,
      operator: SparqlOperator.GT,
      overloads: declare(SparqlOperator.GT)
        .set([ 'term', 'term' ], expressionEvaluator =>
          ([ first, second ]) =>
          // X < Y -> Y > X
            this.lessThanFunction.applyOnTerms([ second, first ], expressionEvaluator))
        .collect(),
    });
  }
}
