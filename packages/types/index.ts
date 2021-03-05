import type { AsyncIterator } from 'asynciterator';
import type { Map } from 'immutable';
import type * as RDF from 'rdf-js';
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
 *
 * Next to the list of available variables,
 * an optional metadata hash can be present.
 *
 * @see Bindings
 */
export type BindingsStream = AsyncIterator<Bindings>;

/**
 * Query operation output for a bindings stream.
 * For example: SPARQL SELECT results
 */
export interface IActorQueryOperationOutputBindings extends IActorQueryOperationOutputStream {
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
  /**
   * If any of the bindings could contain an undefined variable binding.
   * If this is false, then all variables are guaranteed to have a defined bound value in the bindingsStream.
   */
  canContainUndefs: boolean;
}

/**
 * Query operation output for quads.
 * For example: SPARQL CONSTRUCT results
 */
export interface IActorQueryOperationOutputQuads extends IActorQueryOperationOutputStream {
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
 * Query operation output for quads.
 * For example: SPARQL ASK results
 */
export interface IActorQueryOperationOutputBoolean extends IActorQueryOperationOutputBase {
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
 * Binds a quad pattern term's position to a variable.
 */
export type PatternBindings = Record<string, RDF.Variable>;

export interface IActionQueryOperation extends IAction {
  /**
   * The query operation to handle.
   */
  operation: Algebra.Operation;
}

/**
 * Query operation output.
 * @see IActorQueryOperationOutputBindings, IActorQueryOperationOutputQuads, IActorQueryOperationOutputBoolean
 */
// TODO: rename to QueryOutput in next major update
export type IActorQueryOperationOutput =
  IActorQueryOperationOutputStream |
  IActorQueryOperationOutputQuads |
  IActorQueryOperationOutputBoolean;
export interface IActorQueryOperationOutputBase {
  /**
   * The type of output.
   */
  type: string;
  /**
   * The resulting action context.
   */
  context?: ActionContext;
}

/**
 * Super interface for query operation outputs that represent some for of stream.
 * @see IActorQueryOperationOutputBindings, IActorQueryOperationOutputQuads
 */
export interface IActorQueryOperationOutputStream extends IActorQueryOperationOutputBase {
  /**
   * Callback that returns a promise that resolves to the metadata about the stream.
   * This can contain things like the estimated number of total stream elements,
   * or the order in which the bindings appear.
   * This callback can be invoked multiple times.
   * The actors that return this metadata will make sure that multiple calls properly cache this promise.
   * Metadata will not be collected until this callback is invoked.
   */
  metadata?: () => Promise<Record<string, any>>;
}

/**
 * Data interface for the type of action.
 */
export interface IAction {

  /**
   * The optional input context that is passed through by actors.
   */
  context?: ActionContext;
}

/**
 * An immutable key-value mapped context that can be passed to any (@link IAction}.
 * All actors that receive a context must forward this context to any actor, mediator or bus that it calls.
 * This context may be transformed before forwarding.
 *
 * Each bus should describe in its action interface which context entries are possible (non-restrictive)
 * and corresponding context keys should be exposed in '@comunica/context-entries' for easy reuse.
 * If actors support any specific context entries next to those inherited by the bus action interface,
 * then this should be described in its README file.
 *
 * To avoid entry conflicts, all keys must be properly namespaced using the following convention:
 *   Each key must be prefixed with the package name followed by a `:`.
 *   For example, the `rdf-resolve-quad-pattern` bus declares the `sources` entry,
 *   which should be named as `@comunica/bus-rdf-resolve-quad-pattern:sources`.
 *
 * This context can contain any information that might be relevant for certain actors.
 * For instance, this context can contain a list of datasources over which operators should query.
 */
export type ActionContext = Map<string, any>;

export interface IQueryEngine {
  /**
   * Evaluate the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context An optional query context.
   * @return {Promise<IActorQueryOperationOutput>} A promise that resolves to the query output.
   */
  query: (query: string | Algebra.Operation, context?: any) => Promise<IActorQueryOperationOutput>;
  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL (weighted) result media types.
   */
  getResultMediaTypes: (context?: ActionContext) => Promise<Record<string, number>>;
  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL result media type formats.
   */
  getResultMediaTypeFormats: (context?: ActionContext) => Promise<Record<string, string>>;
  /**
   * Convert a query result to a string stream based on a certain media type.
   * @param {IActorQueryOperationOutput} queryResult A query result.
   * @param {string} mediaType A media type.
   * @param {ActionContext} context An optional context.
   * @return {Promise<IActorSparqlSerializeOutput>} A text stream.
   */
  resultToString: (queryResult: IActorQueryOperationOutput, mediaType?: string, context?: any) => any;
  /**
   * Invalidate all internal caches related to the given page URL.
   * If no page URL is given, then all pages will be invalidated.
   * @param {string} url The page URL to invalidate.
   * @return {Promise<any>} A promise resolving when the caches have been invalidated.
   */
  invalidateHttpCache: (url?: string) => Promise<any>;
}
