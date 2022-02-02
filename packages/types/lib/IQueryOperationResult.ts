import type * as RDF from '@rdfjs/types';
import type { QuadTermName, QueryExecuteOptions, ResultStream } from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { Bindings, BindingsStream } from './Bindings';
import type { IActionContext } from './IActionContext';
import type { IMetadata } from './IMetadata';

export interface IQueryOperationResultBase {
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
 * Super interface for query operation results that represent some for of stream.
 * @see IQueryableResultBindings, IQueryableResultQuads
 */
export interface IQueryOperationResultStream extends IQueryOperationResultBase {
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
export interface IQueryOperationResultBindings extends IQueryOperationResultStream {
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
  variables: RDF.Variable[];
}

/**
 * Query operation output for quads.
 * For example: SPARQL CONSTRUCT results
 */
export interface IQueryOperationResultQuads extends IQueryOperationResultStream {
  /**
   * The type of output.
   */
  type: 'quads';
  /**
   * The stream of quads.
   */
  quadStream: RDF.Stream & AsyncIterator<RDF.Quad> & RDF.ResultStream<RDF.Quad>;
}

/**
 * Query operation output for boolean results.
 * For example: SPARQL ASK results
 */
export interface IQueryOperationResultBoolean extends IQueryOperationResultBase {
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
export interface IQueryOperationResultVoid extends IQueryOperationResultBase {
  /**
   * The type of output.
   */
  type: 'void';
  /**
   * A promise resolving when the update has finished.
   */
  voidResult: Promise<void>;
}

/**
 * Query operation output.
 * @see IQueryableResultBindings, IQueryableResultQuads, IQueryableResultBoolean, IQueryableResultVoid
 */
export type IQueryOperationResult =
  IQueryOperationResultBindings |
  IQueryOperationResultQuads |
  IQueryOperationResultBoolean |
  IQueryOperationResultVoid;

/**
 * Enhanced query operation output for a bindings stream.
 * For example: SPARQL SELECT results
 */
export interface IQueryBindingsEnhanced extends RDF.QueryBindings {
  // Override with more specific return type
  execute: (opts?: QueryExecuteOptions<RDF.Variable>) => Promise<BindingsStream>;
  /**
   * The collection of bindings after an 'end' event occured.
   */
  bindings: () => Promise<Bindings[]>;
}

/**
 * Enhanced query operation output for quads.
 * For example: SPARQL CONSTRUCT results
 */
export interface IQueryQuadsEnhanced extends RDF.QueryQuads {
  // Override with more specific return type
  execute: (opts?: QueryExecuteOptions<QuadTermName>) => Promise<AsyncIterator<RDF.Quad> & ResultStream<RDF.Quad>>;
  /**
   * The collection of bindings after an 'end' event occured.
   */
  quads: () => Promise<RDF.Quad[]>;
}

/**
 * Enhanced query operation output.
 * @see IQueryableResultBindingsEnhanced, IQueryableResultQuadsEnhanced, IQueryableResultBoolean, IQueryableResultVoid
 */
export type QueryEnhanced =
  IQueryBindingsEnhanced |
  IQueryQuadsEnhanced |
  RDF.QueryBoolean |
  RDF.QueryVoid;

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
