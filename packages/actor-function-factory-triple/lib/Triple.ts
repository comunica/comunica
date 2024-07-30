import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  Quad,
  DefaultGraph,
} from '@comunica/expression-evaluator';

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
 */
export class Triple extends RegularFunction {
  protected arity = 3;
  public operator = RegularOperator.TRIPLE;

  protected overloads = declare(RegularOperator.TRIPLE)
    .onTerm3(
      _ => (...args) => new Quad(
        args[0],
        args[1],
        args[2],
        new DefaultGraph(),
      ),
    )
    .collect();
}
