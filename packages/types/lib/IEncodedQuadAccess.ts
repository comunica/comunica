import type * as RDF from '@rdfjs/types';

/**
 * Direct access to the quads of an in-memory source as integer-encoded terms.
 *
 * Operators can use it to look up and join quads without creating terms or bindings,
 * and only decode the terms they output.
 */
export interface IEncodedQuadAccess {
  /**
   * Accesses with the same encoding share term ids, so lookups over them can be chained.
   */
  readonly encoding: unknown;
  /**
   * Encode a term.
   * @param term An RDF term.
   * @return The id of the term, or undefined if no quad can contain it.
   */
  encode: (term: RDF.Term) => number | undefined;
  /**
   * Decode an id into a term.
   * @param id The id of a term.
   */
  decode: (id: number) => RDF.Term;
  /**
   * Prepare looking up patterns of which the given components are bound.
   * @param bound For the subject, predicate, object, and graph, whether it is bound.
   * @return A lookup, or undefined if such patterns can not be looked up directly.
   */
  prepareLookup: (bound: readonly [boolean, boolean, boolean, boolean]) => IEncodedLookup | undefined;
}

/**
 * Looks up the quads matching patterns with a fixed set of bound components.
 */
export interface IEncodedLookup {
  /**
   * Append the ids of all matching quads to the given buffer, as subject, predicate, object, and graph.
   * @param ids The ids of the bound components in subject, predicate, object, and graph order.
   *            Unbound components are ignored.
   * @param buffer The buffer to append to.
   * @param limit If given, the maximum number of quads to append.
   * @return The number of appended quads.
   */
  lookup: (ids: ArrayLike<number>, buffer: IEncodedQuadBuffer, limit?: number) => number;
  /**
   * Count the matching quads without producing them.
   * @param ids The ids of the bound components in subject, predicate, object, and graph order.
   * @param limit If given, counting may stop at this number.
   * @return The number of matching quads, or the limit if there are at least that many.
   */
  count: (ids: ArrayLike<number>, limit?: number) => number;
}

/**
 * A growable buffer of encoded quads.
 */
export interface IEncodedQuadBuffer {
  /**
   * The encoded quads, of which only the first `length` values are used.
   */
  data: Int32Array;
  /**
   * The number of used values, which is four times the number of quads.
   */
  length: number;
}
