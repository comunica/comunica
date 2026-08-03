import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strstarts
 * for this and the following functions you'll see (string, langstring) is not allowed. This behaviour is defined in:
 * https://www.w3.org/TR/sparql11-query/#func-arg-compatibility
 */
export class TermFunctionStrStarts extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.STRSTARTS,
      overloads: declare(SparqlOperator.STRSTARTS)
        .onCompatibleStringly2Typed(() => (arg1, arg2) => bool(arg1.startsWith(arg2)))
        .collect(),
    });
  }
}
