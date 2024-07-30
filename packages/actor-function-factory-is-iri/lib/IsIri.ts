import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  bool,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-isIRI
 */
export class IsIri extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IS_IRI;
  protected overloads = declare(RegularOperator.IS_IRI)
    .onTerm1(() => term => bool(term.termType === 'namedNode'))
    .collect();
}
