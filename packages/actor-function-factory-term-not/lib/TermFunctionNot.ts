import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

export class TermFunctionNot extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.NOT,
      overloads: declare(SparqlOperator.NOT)
        .onTerm1(() => val => bool(!val.coerceEBV()))
        .collect(),
    });
  }
}
