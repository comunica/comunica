import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  DefaultGraph,
  Quad,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
 */
export class TermFunctionTriple extends TermFunctionBase {
  public constructor() {
    super({
      arity: 3,
      operator: SparqlOperator.TRIPLE,
      overloads: declare(SparqlOperator.TRIPLE)
        .onTerm3(
          _ => (...args) => new Quad(
            args[0],
            args[1],
            args[2],
            new DefaultGraph(),
          ),
        )
        .collect(),
    });
  }
}
