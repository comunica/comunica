import type * as RDF from 'rdf-js';

/**
 * A blank node that is scoped to a set of bindings.
 */
export class BlankNodeBindingsScoped implements RDF.BlankNode {
  public readonly termType: 'BlankNode' = 'BlankNode';
  public readonly singleBindingsScope: true = true;
  public readonly value: string;

  public constructor(value: string) {
    this.value = value;
  }

  public equals(other: RDF.Term | null | undefined): boolean {
    // TODO: should we always return false given the nature of this class?
    // eslint-disable-next-line no-implicit-coercion
    return !!other && other.termType === 'BlankNode' && other.value === this.value;
  }
}
