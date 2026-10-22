import type * as RDF from '@rdfjs/types';

const TERM_TYPE_PRIORITY: Record<string, number> = {
  DefaultGraph: 0,
  BlankNode: 1,
  NamedNode: 2,
  Literal: 3,
  Quad: 4,
  Variable: 5,
};

/**
 * Compare two terms in the term order that `termOrder` metadata refers to.
 *
 * This orders on term type first (default graph, blank nodes, IRIs, literals, quoted triples),
 * then on value, then on datatype, language, and base direction, and quoted triples component by component.
 * Values are compared as JavaScript strings, so on UTF-16 code units.
 *
 * Unlike the SPARQL order, this is a total order in which two terms compare as equal exactly if they are
 * equal RDF terms, and it never has to interpret a literal. That makes it cheap, and safe to merge-join on.
 * It deliberately does not follow the SPARQL order: for example, "10"^^xsd:integer comes before
 * "9"^^xsd:integer.
 * @param left A term.
 * @param right A term.
 * @return A negative number if `left` comes first, a positive number if `right` comes first, and 0 if they are equal.
 */
export function compareTerms(left: RDF.Term, right: RDF.Term): number {
  if (left.termType !== right.termType) {
    return TERM_TYPE_PRIORITY[left.termType] - TERM_TYPE_PRIORITY[right.termType];
  }
  if (left.termType === 'Quad') {
    const rightQuad = <RDF.BaseQuad> right;
    return compareTerms(left.subject, rightQuad.subject) ||
      compareTerms(left.predicate, rightQuad.predicate) ||
      compareTerms(left.object, rightQuad.object) ||
      compareTerms(left.graph, rightQuad.graph);
  }
  if (left.value !== right.value) {
    return left.value < right.value ? -1 : 1;
  }
  if (left.termType === 'Literal') {
    const rightLiteral = <RDF.Literal> right;
    if (left.datatype.value !== rightLiteral.datatype.value) {
      return left.datatype.value < rightLiteral.datatype.value ? -1 : 1;
    }
    if (left.language !== rightLiteral.language) {
      return left.language < rightLiteral.language ? -1 : 1;
    }
    const leftDirection = left.direction ?? '';
    const rightDirection = rightLiteral.direction ?? '';
    if (leftDirection !== rightDirection) {
      return leftDirection < rightDirection ? -1 : 1;
    }
  }
  return 0;
}
