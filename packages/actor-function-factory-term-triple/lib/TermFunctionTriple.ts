import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  DefaultGraph,
  ExpressionError,
  Quad,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql12-query/#func-triple
 */
export class TermFunctionTriple extends TermFunctionBase {
  public constructor() {
    super({
      arity: 3,
      operator: SparqlOperator.TRIPLE,
      overloads: declare(SparqlOperator.TRIPLE)
        .onTerm3(
          _ => (subject, predicate, object) => {
            if (subject.termType !== 'namedNode' && subject.termType !== 'blankNode') {
              throw new ExpressionError(`TRIPLE: invalid subject term type: ${subject.termType}`);
            }
            if (predicate.termType !== 'namedNode') {
              throw new ExpressionError(`TRIPLE: invalid predicate term type: ${predicate.termType}`);
            }
            return new Quad(subject, predicate, object, new DefaultGraph());
          },
        )
        .collect(),
    });
  }
}
