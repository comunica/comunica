import type * as RDF from '@rdfjs/types';

/**
 * A blank node that is scoped to a set of bindings.
 */
export class BlankNodeBindingsScoped implements RDF.BlankNode {
  public readonly termType = 'BlankNode';
  public readonly singleBindingsScope = true;
  public readonly value: string;

  /**
   * Creates a new bindings-scoped blank node with the given value.
   * @param value The identifier for this blank node.
   */
  public constructor(value: string) {
    this.value = value;
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
