import { TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import {
  declare,
  DefaultGraph,
  ExpressionError,
  Quad,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql12-query/#func-triple
 *
 * Which term types are allowed in which positions depends on the configured RDF variant:
 * https://www.w3.org/TR/rdf12-concepts/#section-generalizations-of-rdf
 */
export class TermFunctionTriple extends TermFunctionBase {
  public constructor() {
    super({
      arity: 3,
      operator: SparqlOperator.TRIPLE,
      overloads: declare(SparqlOperator.TRIPLE)
        .onTerm3(
          exprEval => (subject, predicate, object) => {
            const rdfVariant = exprEval.context.get(KeysInitQuery.rdfVariant);
            if (rdfVariant !== 'generalizedRDF') {
              if (rdfVariant !== 'symmetricRDF' &&
                subject.termType !== 'namedNode' && subject.termType !== 'blankNode') {
                throw new ExpressionError(`Subjects in triple terms must either be named nodes or blank nodes`);
              }
              if (predicate.termType !== 'namedNode') {
                throw new ExpressionError(`Predicates in triple terms must be named nodes`);
              }
            }
            return new Quad(subject, predicate, object, new DefaultGraph());
          },
          false,
        )
        .collect(),
    });
  }
}
