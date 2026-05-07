import type * as RDF from '@rdfjs/types';
import type { ComunicaDataFactory } from './ComunicaDataFactory';
import type { FunctionArgumentsCache } from './ExpressionEvaluator';
import type { IDataDestination } from './IDataDestination';
import type { IProxyHandler } from './IProxyHandler';
import type { SourceType } from './IQueryEngine';
import type { QueryExplainMode } from './IQueryOperationResult';
import type { Logger } from './Logger';

// We omit `& RDF.QuerySourceContext<SourceType>` in the following two types
// as the QuerySourceContext proved to be too developer-unfriendly.

/**
 * Query context when a string-based query was passed.
 */
export type QueryStringContext = RDF.QueryStringContext & IQueryContextCommon;
/**
 * Query context when an algebra-based query was passed.
 */
export type QueryAlgebraContext = RDF.QueryAlgebraContext & IQueryContextCommon;

/**
 * Common query context interface
 */
export interface IQueryContextCommon {
  // Types of these entries should be aligned with contextKeyShortcuts in ActorContextPreprocessConvertShortcuts,
  // Keys in @comunica/context-entries, and possibly the CliArgsHandlers in @comunica/actor-init-query.

  // Inherited from RDF.QueryStringContext: sources
  /**
   * The data destination for write operations.
   */
  destination?: IDataDestination;
  /**
   * Initial variable bindings to apply to the query.
   */
  initialBindings?: RDF.Bindings;
  // Inherited from RDF.QueryStringContext: queryFormat?: string;
  // Inherited from RDF.QueryStringContext: baseIRI?: string;
  /**
   * A custom base IRI for resolving relative file paths.
   */
  fileBaseIRI?: string;
  /**
   * The logger instance to use during query evaluation.
   */
  log?: Logger;
  /**
   * A fixed date to use during query evaluation.
   */
  datetime?: Date;
  // Inherited from RDF.QueryStringContext: queryTimestamp?: Date;
  /**
   * A high-resolution timestamp for the query.
   */
  queryTimestampHighResolution?: DOMHighResTimeStamp;
  /**
   * An HTTP proxy handler for routing HTTP requests through a proxy.
   */
  httpProxyHandler?: IProxyHandler;
  /**
   * Whether the query engine should be lenient about errors in data sources.
   */
  lenient?: boolean;
  /**
   * Whether to parse source versions that are not officially supported.
   */
  parseUnsupportedVersions?: boolean;
  /**
   * Whether to include credentials in cross-origin HTTP requests.
   */
  httpIncludeCredentials?: boolean;
  /**
   * HTTP authentication credentials as a username:password string.
   */
  httpAuth?: string;
  /**
   * The HTTP request timeout in milliseconds.
   */
  httpTimeout?: number;
  /**
   * Whether the timeout also applies to the response body.
   */
  httpBodyTimeout?: boolean;
  /**
   * The number of times to retry failed HTTP requests.
   */
  httpRetryCount?: number;
  /**
   * The fallback delay in milliseconds between HTTP retries.
   */
  httpRetryDelayFallback?: number;
  /**
   * The maximum delay in milliseconds between HTTP retries.
   */
  httpRetryDelayLimit?: number;
  /**
   * The HTTP status codes that trigger a retry.
   */
  httpRetryStatusCodes?: number[];
  /**
   * The number of times to retry fetching the HTTP response body.
   */
  httpRetryBodyCount?: number;
  /**
   * The fallback delay in milliseconds between body fetch retries.
   */
  httpRetryBodyDelayFallback?: number;
  /**
   * Whether unsafe (non-idempotent) requests can be retried for body fetch failures.
   */
  httpRetryBodyAllowUnsafe?: boolean;
  /**
   * The maximum number of bytes to buffer when retrying body fetches.
   */
  httpRetryBodyMaxBytes?: number;
  /**
   * An abort signal to cancel running HTTP requests.
   */
  httpAbortSignal?: AbortSignal;
  /**
   * Whether HTTP caching should be enabled.
   */
  httpCache?: boolean;
  /**
   * A custom fetch function to use for HTTP requests.
   */
  fetch?: typeof fetch;
  /**
   * Whether to attempt recovery of broken links during traversal.
   */
  recoverBrokenLinks?: boolean;
  /**
   * Whether the query engine should operate in read-only mode.
   */
  readOnly?: boolean;
  /**
   * A record of custom SPARQL extension functions keyed by IRI.
   */
  extensionFunctions?: Record<string, (args: RDF.Term[]) => Promise<RDF.Term>>;
  /**
   * Whether extension functions should always be pushed down to the sources.
   */
  extensionFunctionsAlwaysPushdown?: boolean;
  /**
   * A factory function that creates extension functions from a function named node.
   */
  extensionFunctionCreator?: (functionNamedNode: RDF.NamedNode)
  => ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined;
  /**
   * A cache for storing resolved function arguments.
   */
  functionArgumentsCache?: FunctionArgumentsCache;
  /**
   * The mode for explaining query execution plans.
   */
  explain?: QueryExplainMode;
  /**
   * Whether the default graph should be the union of all named graphs.
   */
  unionDefaultGraph?: boolean;
  /**
   * Whether link traversal should be enabled.
   */
  traverse?: boolean;
  /**
   * Whether the HTTP cache should be invalidated before querying.
   */
  invalidateCache?: boolean;
  /**
   * The RDF data factory to use for creating RDF terms.
   */
  dataFactory?: ComunicaDataFactory;
  /**
   * Whether duplicate quads should be removed from CONSTRUCT results.
   */
  distinctConstruct?: boolean;
  /**
   * A record of namespace prefixes for RDF serialization.
   */
  rdfSerializationPrefixes?: Record<string, string>;

  /**
   * The query sources to evaluate the query against.
   */
  sources: SourceType[];
}
