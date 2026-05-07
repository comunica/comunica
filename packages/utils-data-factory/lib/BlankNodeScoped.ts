import type * as RDF from '@rdfjs/types';

/**
 * A blank node that is scoped to a certain source.
 */
export class BlankNodeScoped implements RDF.BlankNode {
  public readonly termType = 'BlankNode';
  public readonly value: string;
  /**
   * This value can be obtained by consumers in query results,
   * so that this can be passed into another query as an IRI,
   * in order to obtain more results relating to this (blank) node.
   */
  public readonly skolemized: RDF.NamedNode;

  /**
   * Creates a new source-scoped blank node with the given value and skolemized IRI.
   * @param value The identifier for this blank node.
   * @param skolemized The skolemized named node IRI representing this blank node.
   */
  public constructor(value: string, skolemized: RDF.NamedNode) {
    this.value = value;
    this.skolemized = skolemized;
  }

  /**
   * Checks whether this blank node is equal to another term.
   * @param other The term to compare against.
   * @return True if the other term is a blank node with the same value.
   */
  public equals(other: RDF.Term | null | undefined): boolean {
    // eslint-disable-next-line no-implicit-coercion
    return !!other && other.termType === 'BlankNode' && other.value === this.value;
  }
}
