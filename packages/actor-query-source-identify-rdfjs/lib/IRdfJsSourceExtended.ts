import type * as RDF from '@rdfjs/types';

export interface IRdfJsSourceExtended extends RDF.Source {
  /**
   * A record indicating supported features of this source.
   */
  features?: {
    /**
     * If true, this source supports passing quad patterns with quoted quad patterns in the `match` method.
     * If false (or if `features` is `undefined`), such quoted quad patterns can not be passed,
     * and must be replaced by `undefined` and filtered by the caller afterwards.
     */
    quotedTripleFiltering?: boolean;
  };

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
