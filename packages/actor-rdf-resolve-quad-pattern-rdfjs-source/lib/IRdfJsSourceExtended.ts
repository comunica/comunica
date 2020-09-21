import type * as RDF from 'rdf-js';

export interface IRdfJsSourceExtended extends RDF.Source {
  /**
   * Return an estimated count of the number of quads matching the given pattern.
   *
   * The better the estimate, the better the query engine will be able to optimize the query.
   *
   * @param subject   An optional subject.
   * @param predicate An optional predicate.
   * @param object    An optional object.
   * @param graph     An optional graph.
   */
  countQuads?: (
    subject?: RDF.Term,
    predicate?: RDF.Term,
    object?: RDF.Term,
    graph?: RDF.Term,
  ) => Promise<number> | number;
}
