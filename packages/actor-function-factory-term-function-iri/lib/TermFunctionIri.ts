import { TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysInitQuery } from '@comunica/context-entries';

import {
  declare,
  NamedNode,
  SparqlOperator,
} from '@comunica/expression-evaluator';
import { resolve as resolveRelativeIri } from 'relative-to-absolute-iri';

/**
 * https://www.w3.org/TR/sparql11-query/#func-iri
 */
export class TermFunctionIri extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.IRI,
      overloads: declare(SparqlOperator.IRI)
        .set([ 'namedNode' ], exprEval => (args) => {
          const lit = <NamedNode> args[0];
          const iri = resolveRelativeIri(lit.str(), exprEval.context.get(KeysInitQuery.baseIRI) ?? '');
          return new NamedNode(iri);
        })
        .onString1(exprEval => (lit) => {
          const iri = resolveRelativeIri(lit.str(), exprEval.context.get(KeysInitQuery.baseIRI) ?? '');
          return new NamedNode(iri);
        })
        .collect(),
    });
  }
}
