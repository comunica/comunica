import { RegularFunction } from '@comunica/bus-function-factory';
import { KeysInitQuery } from '@comunica/context-entries';

import {
  RegularOperator,
  declare,
  NamedNode,
} from '@comunica/expression-evaluator';
import { resolve as resolveRelativeIri } from 'relative-to-absolute-iri';

/**
 * https://www.w3.org/TR/sparql11-query/#func-iri
 */
export class Iri extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.IRI;

  protected overloads = declare(RegularOperator.IRI)
    .set([ 'namedNode' ], exprEval => (args) => {
      const lit = <NamedNode> args[0];
      const iri = resolveRelativeIri(lit.str(), exprEval.context.get(KeysInitQuery.baseIRI) ?? '');
      return new NamedNode(iri);
    })
    .onString1(exprEval => (lit) => {
      const iri = resolveRelativeIri(lit.str(), exprEval.context.get(KeysInitQuery.baseIRI) ?? '');
      return new NamedNode(iri);
    })
    .collect();
}
