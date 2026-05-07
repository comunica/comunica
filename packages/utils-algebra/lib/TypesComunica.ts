/**
 * Algebra operations that are defined by Comunica for internal use, but are not part of the SPARQL spec.
 */
export enum TypesComunica {
  /** Represents a nodes operation that retrieves all nodes from a graph. */
  NODES = 'nodes',
  /** Represents a distinct-terms operation that filters duplicate terms. */
  DISTINCT_TERMS = 'distinctterms',
}
