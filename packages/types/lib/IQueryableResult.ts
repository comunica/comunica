import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { Bindings, BindingsStream } from './Bindings';
import type { IActionContext } from './IActionContext';
import type { IMetadata } from './IMetadata';

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
  variables: RDF.Variable[];
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
