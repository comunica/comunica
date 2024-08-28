import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/expression-evaluator';

export class TermFunctionGreaterThanEqual extends TermFunctionBase {
  public constructor(private readonly lessThanEqualFunction: TermFunctionBase) {
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
