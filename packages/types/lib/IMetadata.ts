import type * as RDF from '@rdfjs/types';

/**
 * A type-safe metadata object.
 * This interface still allows other non-standard metadata entries to be added.
 */
export interface IMetadata<OrderItemsType extends RDF.Variable | RDF.QuadTermName> extends Record<string, any> {
  /**
   * The validity state of this metadata object.
   */
  state: IMetadataValidationState;

  /**
   * An estimate of the number of bindings in the source.
   */
  cardinality: QueryResultCardinality;

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
  variables: MetadataVariable[];
};
export type MetadataVariable = {
  /**
   * The variable.
   */
  variable: RDF.Variable;
  /**
   * If the bindings stream could contain undefined bindings for this variable.
   * If this is false, then values for this variable are guaranteed to be defined in the bindingsStream.
   */
  canBeUndef: boolean;
};
export type MetadataQuads = IMetadata<RDF.QuadTermName>;

export type QueryResultCardinality = RDF.QueryResultCardinality & {
  /**
   * If this field is set, this means that the cardinality is defined across this whole dataset.
   * If this field is not set, then the cardinality is only defined for the current stream.
   */
  dataset?: string;
};

/**
 * Represents the validity of a metadata object.
 */
export interface IMetadataValidationState {
  /**
   * If the metadata object is valid.
   *
   * If it is invalid, the metadata values should be considered outdated, and a new version should be requested.
   */
  valid: boolean;
  /**
   * Mark the metadta object as invalid.
   *
   * This will set the `valid` field to false, and invoke the invalidation listeners.
   */
  invalidate: () => void;
  /**
   * Add an listener that will be invoked when the metadata object becomes invalid.
   *
   * No expensive operations should be done in these listeners, only other invalidations.
   * If other operations should be done, those should be scheduled in next ticks.
   *
   * @param listener An invalidation listener.
   */
  addInvalidateListener: (listener: () => void) => void;
}
