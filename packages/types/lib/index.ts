import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { Map } from 'immutable';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * An immutable solution mapping object.
 * This maps variables to a terms.
 *
 * Variables are represented as strings containing the variable name prefixed with '?'.
 * Blank nodes are represented as strings containing the blank node name prefixed with '_:'.
 * Terms are named nodes, literals or the default graph.
 */
export type Bindings = Map<string, RDF.Term>;

/**
 * A stream of bindings.
 * @see Bindings
 */
export type BindingsStream = AsyncIterator<Bindings>;

export interface IQueryableResultBase {
  /**
   * The type of output.
   */
  type: string;
  /**
   * The resulting action context.
   */
  context?: IActionContext;
}

/**
 * Super interface for query results that represent some for of stream.
 * @see IQueryableResultBindings, IQueryableResultQuads
 */
export interface IQueryableResultStream extends IQueryableResultBase {
  /**
   * Callback that returns a promise that resolves to the metadata about the stream.
   * This can contain things like the estimated number of total stream elements,
   * or the order in which the bindings appear.
   * This callback can be invoked multiple times.
   * The actors that return this metadata will make sure that multiple calls properly cache this promise.
   * Metadata will not be collected until this callback is invoked.
   */
  metadata: () => Promise<IMetadata>;
}

/**
 * Query operation output for a bindings stream.
 * For example: SPARQL SELECT results
 */
export interface IQueryableResultBindings extends IQueryableResultStream {
  /**
   * The type of output.
   */
  type: 'bindings';
  /**
   * The stream of bindings resulting from the given operation.
   */
  bindingsStream: BindingsStream;
  /**
   * The list of variable names (without '?') for which bindings are provided in the stream.
   */
  variables: string[];
}

/**
 * Query operation output for quads.
 * For example: SPARQL CONSTRUCT results
 */
export interface IQueryableResultQuads extends IQueryableResultStream {
  /**
   * The type of output.
   */
  type: 'quads';
  /**
   * The stream of quads.
   */
  quadStream: RDF.Stream & AsyncIterator<RDF.Quad>;
}

/**
 * Query operation output for boolean results.
 * For example: SPARQL ASK results
 */
export interface IQueryableResultBoolean extends IQueryableResultBase {
  /**
   * The type of output.
   */
  type: 'boolean';
  /**
   * A promise resolving to the boolean output of the operation.
   */
  booleanResult: Promise<boolean>;
}

/**
 * Query operation output for boolean results.
 * For example: SPARQL UPDATE results
 */
export interface IQueryableResultVoid extends IQueryableResultBase {
  /**
   * The type of output.
   */
  type: 'update';
  /**
   * A promise resolving when the update has finished.
   */
  updateResult: Promise<void>;
}

/**
 * Query operation output.
 * @see IQueryableResultBindings, IQueryableResultQuads, IQueryableResultBoolean, IQueryableResultVoid
 */
export type IQueryableResult =
  IQueryableResultBindings |
  IQueryableResultQuads |
  IQueryableResultBoolean |
  IQueryableResultVoid;

/**
 * Enhanced query operation output for a bindings stream.
 * For example: SPARQL SELECT results
 */
export interface IQueryableResultBindingsEnhanced extends IQueryableResultBindings {
  /**
   * The collection of bindings after an 'end' event occured.
   */
  bindings: () => Promise<Bindings[]>;
}

/**
 * Enhanced query operation output for quads.
 * For example: SPARQL CONSTRUCT results
 */
export interface IQueryableResultQuadsEnhanced extends IQueryableResultQuads {
  /**
   * The collection of bindings after an 'end' event occured.
   */
  quads: () => Promise<RDF.Quad[]>;
}

/**
 * Enhanced query operation output.
 * @see IQueryableResultBindingsEnhanced, IQueryableResultQuadsEnhanced, IQueryableResultBoolean, IQueryableResultVoid
 */
export type IQueryableResultEnhanced =
  IQueryableResultBindingsEnhanced |
  IQueryableResultQuadsEnhanced |
  IQueryableResultBoolean |
  IQueryableResultVoid;

/**
 * A type-safe metadata object.
 * This interface still allows other non-standard metadata entries to be added.
 */
export interface IMetadata extends Record<string, any> {
  /**
   * An estimate of the number of bindings in the source.
   */
  cardinality: number;
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
  order?: { variable: string; order: 'asc' | 'desc' }[];
}

/**
 * Different manners in which a query can be explained.
 */
export type QueryExplainMode = 'parsed' | 'logical' | 'physical';

/**
 * An interface marking an explained query.
 */
export interface IQueryExplained {
  explain: true;
  /**
   * The mode of explanation
   */
  type: QueryExplainMode;
  /**
   * The raw explanation data
   */
  data: any;
}

/**
 * A physical query plan logger collects operations, which can then be serialized as a query plan to JSON.
 */
export interface IPhysicalQueryPlanLogger {
  /**
   * Log an operation.
   *
   * Important here is that the `node` and `parentNode` can be of any type,
   * as long as they properly reference each other in subsequent calls.
   * These node references can be used to build up a hierarchy.
   *
   * @param logicalOperator The current logical query operator.
   * @param physicalOperator The current physical query operator.
   *                         This may be omitted if no physical operator applies.
   * @param node The current operation node.
   * @param parentNode The parent operation node.
   * @param actor The current actor name.
   * @param metadata Metadata to include together in the physical query plan output for this node.
   */
  logOperation: (
    logicalOperator: string,
    physicalOperator: string | undefined,
    node: any,
    parentNode: any,
    actor: string,
    metadata: any,
  ) => void;
  /**
   * Serialize the collected query plan to JSON.
   */
  toJson: () => any;
}

/**
 * An immutable key-value mapped context that can be passed to any (@link IAction}.
 * All actors that receive a context must forward this context to any actor, mediator or bus that it calls.
 * This context may be transformed before forwarding.
 *
 * For type-safety, the keys of this context can only be instances of {@link IActionContextKey},
 * where each key supplies acceptable the value type.
 *
 * Each bus should describe in its action interface which context entries are possible (non-restrictive)
 * and corresponding context keys should be exposed in '@comunica/context-entries' for easy reuse.
 * If actors support any specific context entries next to those inherited by the bus action interface,
 * then this should be described in its README file.
 *
 * This context can contain any information that might be relevant for certain actors.
 * For instance, this context can contain a list of datasources over which operators should query.
 */
export interface IActionContext {
  set: <V>(key: IActionContextKey<V>, value: V) => IActionContext;
  delete: <V>(key: IActionContextKey<V>) => IActionContext;
  get: <V>(key: IActionContextKey<V>) => V | undefined;
  has: <V>(key: IActionContextKey<V>) => boolean;
  merge: (...contexts: IActionContext[]) => IActionContext;
  keys: () => IActionContextKey<any>[];
  toJS: () => any;
}

/**
 * Keys that can be used within an {@link IActionContext}.
 *
 * To avoid entry conflicts, all keys must be properly namespaced using the following convention:
 * Each key name must be prefixed with the package name followed by a `:`.
 * For example, the `rdf-resolve-quad-pattern` bus declares the `sources` entry,
 * which should be named as `@comunica/bus-rdf-resolve-quad-pattern:sources`.
 */
export interface IActionContextKey<V> {
  readonly name: string;
}

export interface IQueryEngine {
  /**
   * Evaluate the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context An optional query context.
   * @return {Promise<IQueryableResult>} A promise that resolves to the query output.
   */
  query: (query: string | Algebra.Operation, context?: any) => Promise<IQueryableResult>;
  /**
   * Evaluate the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context An optional query context.
   * @return {Promise<IQueryableResult | IQueryExplained>}
   *  A promise that resolves to the query output.
   */
  queryOrExplain: (
    query: string | Algebra.Operation,
    context?: any,
  ) => Promise<IQueryableResult | IQueryExplained>;
  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL (weighted) result media types.
   */
  getResultMediaTypes: (context?: IActionContext) => Promise<Record<string, number>>;
  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL result media type formats.
   */
  getResultMediaTypeFormats: (context?: IActionContext) => Promise<Record<string, string>>;
  /**
   * Convert a query result to a string stream based on a certain media type.
   * @param {IQueryableResult} queryResult A query result.
   * @param {string} mediaType A media type.
   * @param {ActionContext} context An optional context.
   * @return {Promise<IActorSparqlSerializeOutput>} A text stream.
   */
  resultToString: (queryResult: IQueryableResult, mediaType?: string, context?: any) => any;
  /**
   * Invalidate all internal caches related to the given page URL.
   * If no page URL is given, then all pages will be invalidated.
   * @param {string} url The page URL to invalidate.
   * @return {Promise<any>} A promise resolving when the caches have been invalidated.
   */
  invalidateHttpCache: (url?: string) => Promise<any>;
}
