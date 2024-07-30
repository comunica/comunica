import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  bool,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#istriple
 */
export class IsTriple extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IS_TRIPLE;

  protected overloads = declare(RegularOperator.IS_TRIPLE)
    .onTerm1(() => term => bool(term.termType === 'quad'))
    .collect();
}
