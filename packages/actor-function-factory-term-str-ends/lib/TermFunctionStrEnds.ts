import { TermFunctionBase } from '@comunica/bus-function-factory';
import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strends
 */
export class TermFunctionStrEnds extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.STRENDS,
      overloads: declare(SparqlOperator.STRENDS)
        .onCompatibleStringly2Typed(() => (arg1, arg2) => bool(arg1.endsWith(arg2)))
        .collect(),
    });
  }
}
