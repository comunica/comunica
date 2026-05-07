import type { ITermFunction } from '@comunica/bus-function-factory';
import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#OperatorMapping
 */
export class TermFunctionGreaterThanEqual extends TermFunctionBase {
  public constructor(private readonly lessThanEqualFunction: ITermFunction) {
    super({
      arity: 2,
      operator: SparqlOperator.GTE,
      overloads: declare(SparqlOperator.GTE)
        .set([ 'term', 'term' ], exprEval =>
          ([ first, second ]) =>
            // X >= Y -> Y <= X
            this.lessThanEqualFunction.applyOnTerms([ second, first ], exprEval))
        .collect(),
    });
  }
}
