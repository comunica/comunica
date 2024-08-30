import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
} from '@comunica/expression-evaluator';

export class TermFunctionUnaryMinus extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.UMINUS,
      overloads: declare(SparqlOperator.UMINUS)
        .numericConverter(() => val => -val)
        .collect(),
    });
  }
}
