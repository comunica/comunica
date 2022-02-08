import type * as RDF from '@rdfjs/types';

/**
 * A type-safe metadata object.
 * This interface still allows other non-standard metadata entries to be added.
 */
export interface IMetadata<OrderItemsType extends RDF.Variable | RDF.QuadTermName> extends Record<string, any> {
  /**
   * An estimate of the number of bindings in the source.
   */
  cardinality: RDF.QueryResultCardinality;
  /**
   * If any of the bindings could contain an undefined variable binding.
   * If this is false, then all variables are guaranteed to have a defined bound value in the bindingsStream.
   */
  canContainUndefs: boolean;

  /* Entries below are optional */

  /**
   * The number of bindings per page in the source.
   * This may be undefined for sources that don't do paging.
   */
  pageSize?: number;
  /**
   * The time it takes to request a page in milliseconds.
   * This is the time until the first byte arrives.
   */
  requestTime?: number;
  /**
   * The order of the bindings in the stream.
   *
   * For example, [{ variable: 'keyA', order: 'asc' }, { variable: 'keyB', order: 'desc' }] indicates that bindings are
   * first sorted first by values of 'keyA' in ascending order, and then by 'keyB' in descending order.
   *
   * Order is defined according to the SPARQL order semantics.
   * For ascending order, this corresponds to https./www.w3.org/TR/sparql11-query/#op_lt,
   * otherwise the inverse.
   * For those cases where SPARQL does not define order, the (ascending) order is defined as a lexicographical
   * comparison on the string values of terms, which is defined by `termToString` from the `"rdf-string"` package.
   *
   * If order is undefined, then the order is unknown.
   */
  order?: TermsOrder<OrderItemsType>;

  /**
   * All available alternative orders.
   */
  availableOrders?: RDF.QueryOperationOrder<OrderItemsType>[];
}

export type TermsOrder<OrderItemsType> = { term: OrderItemsType; direction: 'asc' | 'desc' }[];
export type MetadataBindings = IMetadata<RDF.Variable> & {
  /**
   * The list of variables for which bindings are provided in the bindings stream.
   */
  variables: RDF.Variable[];
};
export type MetadataQuads = IMetadata<RDF.QuadTermName>;
