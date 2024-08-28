import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  bool,
  declare,
  SparqlOperator,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-isLiteral
 */
export class TermFunctionIsLiteral extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.IS_LITERAL,
      overloads: declare(SparqlOperator.IS_LITERAL)
        .onTerm1(() => term => bool(term.termType === 'literal'))
        .collect(),
    });
  }
}
