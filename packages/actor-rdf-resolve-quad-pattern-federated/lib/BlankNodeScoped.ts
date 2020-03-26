import * as RDF from "rdf-js";

/**
 * A blank node that is scoped to a certain source.
 */
export class BlankNodeScoped implements RDF.BlankNode {
  public readonly termType: 'BlankNode' = 'BlankNode';
  public readonly value: string;
  /**
   * This value can be obtained by consumers in query results,
   * so that this can be passed into another query as an IRI,
   * in order to obtain more results relating to this (blank) node.
   */
  public readonly skolemized: RDF.NamedNode;

  constructor(value: string, skolemized: RDF.NamedNode) {
    this.value = value;
    this.skolemized = skolemized;
  }

  public equals(other: RDF.Term | null | undefined): boolean {
    return !!other && other.termType === 'BlankNode' && other.value === this.value;
  }

}
