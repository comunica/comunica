import { TermFunctionBase } from '@comunica/bus-function-factory';
import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-contains
 */
export class TermFunctionContains extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.CONTAINS,
      overloads: declare(SparqlOperator.CONTAINS)
        .onCompatibleStringly2Typed(() => (arg1, arg2) => bool(arg1.includes(arg2)))
        .collect(),
    });
  }
}
