import { ActionContextKey, CONTEXT_KEY_LOGGER } from '@comunica/core';
import type {
  AsyncExtensionFunctionCreator,
  Bindings,
  FunctionArgumentsCache,
  IActionContext,
  ICliArgsHandler,
  IDataDestination,
  IPhysicalQueryPlanLogger,
  IProxyHandler,
  IQuerySourceWrapper,
  ISuperTypeProvider,
  ITimeZoneRepresentation,
  MetadataBindings,
  QueryExplainMode,
  QuerySourceReference,
  QuerySourceUnidentified,
  ComunicaDataFactory,
  IStatisticBase,
  IDiscoverEventData,
  PartialResult,
  ILink,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import type { IDocumentLoader } from 'jsonld-context-parser';

/**
 * When adding entries to this file, also add a shortcut for them in the contextKeyShortcuts TSDoc comment in
 * ActorContextPreprocessConvertShortcuts in @comunica/actor-init-query if it makes sense to use this entry externally.
 * Also, add this shortcut to IQueryContextCommon in @comunica/types,
 * and possibly the CliArgsHandlers in @comunica/actor-init-query.
 */

/**
 * Context keys for core engine functionality.
 */
export const KeysCore = {
  // We create the core context keys in @comunica/core to avoid a cyclic dependency
  /**
   * A logger instance.
   */
  log: CONTEXT_KEY_LOGGER,
};

/**
 * Context keys for HTTP request configuration.
 */
export const KeysHttp = {
  /**
   * Include credentials flags.
   */
  includeCredentials: new ActionContextKey<boolean>('@comunica/bus-http:include-credentials'),
  /**
   * Authentication for a source as a "username:password"-pair.
   */
  auth: new ActionContextKey<string>('@comunica/bus-http:auth'),
  /**
   * Fetch function implementation.
   */
  fetch: new ActionContextKey<typeof fetch>('@comunica/bus-http:fetch'),
  /**
   * HTTP request timeout in milliseconds.
   */
  httpTimeout: new ActionContextKey<number>('@comunica/bus-http:http-timeout'),
  /**
   * Makes the HTTP timeout not only apply until the response starts streaming in
   * but until the response is fully consumed.
   */
  httpBodyTimeout: new ActionContextKey<boolean>('@comunica/bus-http:http-body-timeout'),
  /**
   * Number of retries to make on failed network calls. This only takes effect
   * on errors thrown during the initial fetch() call and not while streaming the body.
   */
  httpRetryCount: new ActionContextKey<number>('@comunica/bus-http:http-retry-count'),
  /**
   * The fallback retry delay in milliseconds. This value is used when a server does not
   * send a delay value in the Retry-After header or if the header value is incorrectly formatted.
   */
  httpRetryDelayFallback: new ActionContextKey<number>('@comunica/bus-http:http-retry-delay-fallback'),
  /**
   * The upper limit for the retry delay in milliseconds. When a server requests a delay larger than this,
   * the engine will consider it unavailable until the specified timestamp is close enough.
   */
  httpRetryDelayLimit: new ActionContextKey<number>('@comunica/bus-http:http-retry-delay-limit'),
  /**
   * HTTP status codes that should always trigger a retry, regardless of the default behaviour.
   * This can be used to, for example, force retries on server-side errors in the 500 range.
   */
  httpRetryStatusCodes: new ActionContextKey<number[]>('@comunica/bus-http:http-retry-status-codes'),
  /**
   * Number of retries to make when the response body stream errors mid-read.
   * Response bodies are buffered per attempt (unless disabled by `httpRetryBodyMaxBytes`)
   * to avoid emitting partial data to downstream parsers.
   */
  httpRetryBodyCount: new ActionContextKey<number>('@comunica/bus-http:http-retry-body-count'),
  /**
   * The fallback retry delay in milliseconds between body retries.
   */
  httpRetryBodyDelayFallback: new ActionContextKey<number>('@comunica/bus-http:http-retry-body-delay-fallback'),
  /**
   * Allow body retries for non-idempotent methods or non-replayable request bodies.
   */
  httpRetryBodyAllowUnsafe: new ActionContextKey<boolean>('@comunica/bus-http:http-retry-body-allow-unsafe'),
  /**
   * Maximum number of bytes to buffer when retrying response body streams.
   * When exceeded, body retries are disabled and the response will continue streaming as-is.
   */
  httpRetryBodyMaxBytes: new ActionContextKey<number>('@comunica/bus-http:http-retry-body-max-bytes'),
  /**
   * An abort signal for aborting pending HTTP requests.
   */
  httpAbortSignal: new ActionContextKey<AbortSignal>('@comunica/bus-http:http-abort-controller'),
  /**
   * If the HTTP-level cache must be enabled.
   * When enabled, HTTP responses will be stored within the cache, and/or responses can be read from the cache.
   * This only will only do something outside a browser environment, as browsers take care of caching internally.
   */
  httpCache: new ActionContextKey<boolean>('@comunica/bus-http:httpCache'),
};

/**
 * Context keys for WayBack machine link recovery.
 */
export const KeysHttpWayback = {
  /**
   * Use the WayBack machine to get the most recent representation of a file if a link is broken.
   * @default false
   */
  recoverBrokenLinks: new ActionContextKey<boolean>('@comunica/bus-http:recover-broken-links'),
};

/**
 * Context keys for Memento-based datetime negotiation.
 */
export const KeysHttpMemento = {
  /**
   * The desired datetime for Memento datetime-negotiation.
   */
  datetime: new ActionContextKey<Date>('@comunica/actor-http-memento:datetime'),
};

/**
 * Context keys for HTTP proxy configuration.
 */
export const KeysHttpProxy = {
  /**
   * The proxy handler that intercepts and routes HTTP requests.
   */
  httpProxyHandler: new ActionContextKey<IProxyHandler>('@comunica/actor-http-proxy:httpProxyHandler'),
};

/**
 * Context keys for query engine initialization and configuration.
 */
export const KeysInitQuery = {
  /**
   * The unidentified sources to query over.
   */
  querySourcesUnidentified: new ActionContextKey<QuerySourceUnidentified[]>(
    '@comunica/actor-init-query:querySourcesUnidentified',
  ),
  /**
   * Variables that have to be pre-bound to values in the query.
   */
  initialBindings: new ActionContextKey<RDF.Bindings>('@comunica/actor-init-query:initialBindings'),
  /**
   * The provided query's format.
   * Defaults to { language: 'sparql', version: '1.1' }
   */
  queryFormat: new ActionContextKey<RDF.QueryFormat>('@comunica/actor-init-query:queryFormat'),
  /**
   * Which GraphQL bindings should be singularized.
   */
  graphqlSingularizeVariables: new ActionContextKey<any>('@comunica/actor-init-query:singularizeVariables'),
  /**
   * If HTTP and parsing failures are ignored.
   */
  lenient: new ActionContextKey<boolean>('@comunica/actor-init-query:lenient'),
  /**
   * By default, errors will be emitted if parsers encounter unsupported versions.
   * Setting this flag to true will silence those checks.
   * Errors may still be emitted if unsupported grammar is encountered.
   */
  parseUnsupportedVersions: new ActionContextKey<boolean>('@comunica/actor-init-query:parseUnsupportedVersions'),
  /**
   * The original query string.
   */
  queryString: new ActionContextKey<string>('@comunica/actor-init-query:queryString'),
  /**
   * The original parsed query.
   */
  query: new ActionContextKey<Algebra.Operation>('@comunica/actor-init-query:query'),
  /**
   * The query's base IRI.
   */
  baseIRI: new ActionContextKey<string>('@comunica/actor-init-query:baseIRI'),
  /**
   * The file's base IRI.
   */
  fileBaseIRI: new ActionContextKey<string>('@comunica/actor-init-query:fileBaseIRI'),
  /**
   * Object to cache function argument overload resolutions.
   * Defaults to an object that is reused across query executions.
   */
  functionArgumentsCache: new ActionContextKey<FunctionArgumentsCache>(
    '@comunica/actor-init-query:functionArgumentsCache',
  ),
  /**
   * A timestamp representing the current time.
   * This is required for certain SPARQL operations such as NOW().
   */
  queryTimestamp: new ActionContextKey<Date>('@comunica/actor-init-query:queryTimestamp'),
  /**
   * A high resolution timestamp representing the time elapsed since Performance.timeOrigin`.
   * It can be used to precisely measure durations from the start of query execution.
   */
  queryTimestampHighResolution: new ActionContextKey<DOMHighResTimeStamp>(
    '@comunica/actor-init-query:queryTimestampHighResolution',
  ),
  /**
   * @range {functionNamedNode: RDF.NamedNode) => ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined}
   * Extension function creator for a given function IRI.
   * Returned value should be an async function implementation.
   * Undefined may be returned if no implementation exists for the given function IRI.
   *
   * The dictionary-based extensionFunctions context entry may be used instead, but not simultaneously.
   */
  extensionFunctionCreator: new ActionContextKey<AsyncExtensionFunctionCreator>(
    '@comunica/actor-init-query:extensionFunctionCreator',
  ),
  /**
   * Dictionary of extension functions.
   * Key is the IRI of the function, and value is the async function implementation.
   *
   * The callback-based extensionFunctionCreator context entry may be used instead, but not simultaneously.
   */
  extensionFunctions: new ActionContextKey<
  Record<string, (args: RDF.Term[]) => Promise<RDF.Term>>
    >('@comunica/actor-init-query:extensionFunctions'),
  /**
   * If extension functions must always be pushed down to sources that support expressions,
   * even if those sources to not explicitly declare support for these extension functions.
   */
  extensionFunctionsAlwaysPushdown: new ActionContextKey<boolean>(
    '@comunica/actor-init-query:extensionFunctionsAlwaysPushdown',
  ),
  /**
   * Enables manipulation of the CLI arguments and their processing.
   */
  cliArgsHandlers: new ActionContextKey<ICliArgsHandler[]>('@comunica/actor-init-query:cliArgsHandlers'),
  /**
   * Explain mode of the query. Can be 'parsed', 'logical', 'query', 'physical', or 'physical-json'.
   */
  explain: new ActionContextKey<QueryExplainMode>('@comunica/actor-init-query:explain'),
  /**
   * Logs the used physical operators
   */
  physicalQueryPlanLogger: new ActionContextKey<IPhysicalQueryPlanLogger>(
    '@comunica/actor-init-query:physicalQueryPlanLogger',
  ),
  /**
   * The current physical operator within the query plan.
   *              This is used to pass parent-child relationships for invoking the query plan logger.
   */
  physicalQueryPlanNode: new ActionContextKey<any>('@comunica/actor-init-query:physicalQueryPlanNode'),
  /**
   * A JSON-LD context
   */
  jsonLdContext: new ActionContextKey<any>('@context'),
  /**
   * A boolean value denoting whether caching is disabled or not.
   */
  invalidateCache: new ActionContextKey<boolean>('@comunica/actor-init-query:invalidateCache'),
  /**
   * The data factory for creating terms and quads.
   */
  dataFactory: new ActionContextKey<ComunicaDataFactory>('@comunica/actor-init-query:dataFactory'),
  /**
   * A boolean value denoting whether results should be deduplicated or not.
   */
  distinctConstruct: new ActionContextKey<boolean>('@comunica/actor-init-query:distinctConstruct'),
};

/**
 * Context keys for SPARQL expression evaluation settings.
 */
export const KeysExpressionEvaluator = {
  /**
   * A factory for creating asynchronous extension functions used during expression evaluation.
   */
  extensionFunctionCreator: new ActionContextKey<AsyncExtensionFunctionCreator>(
    '@comunica/utils-expression-evaluator:extensionFunctionCreator',
  ),
  /**
   * Provides supertype relationships for custom RDF literal datatypes.
   */
  superTypeProvider: new ActionContextKey<ISuperTypeProvider>('@comunica/utils-expression-evaluator:superTypeProvider'),
  /**
   * The default timezone used when evaluating date/time expressions without explicit timezone.
   */
  defaultTimeZone: new ActionContextKey<ITimeZoneRepresentation>(
    '@comunica/utils-expression-evaluator:defaultTimeZone',
  ),
  /**
   * The action context passed to expression evaluation for access to engine state.
   */
  actionContext: new ActionContextKey<IActionContext>('@comunica/utils-expression-evaluator:actionContext'),
};

/**
 * Context keys for query operation processing.
 */
export const KeysQueryOperation = {
  /**
   * Context entry for the current query operation.
   */
  operation: new ActionContextKey<Algebra.Operation>('@comunica/bus-query-operation:operation'),
  /**
   * @type {any} The metadata from the left streams within a join operation.
   */
  joinLeftMetadata: new ActionContextKey<MetadataBindings>('@comunica/bus-query-operation:joinLeftMetadata'),
  /**
   * An array of metadata from the right streams within a join operation.
   */
  joinRightMetadatas: new ActionContextKey<MetadataBindings[]>('@comunica/bus-query-operation:joinRightMetadatas'),
  /**
   * Indicates the bindings that were used to bind the operation.
   */
  joinBindings: new ActionContextKey<Bindings>('@comunica/bus-query-operation:joinBindings'),
  /**
   * Flag for indicating that only read operations are allowed, defaults to false.
   */
  readOnly: new ActionContextKey<boolean>('@comunica/bus-query-operation:readOnly'),
  /**
   * An internal context entry to mark that a property path with arbitrary length and a distinct key is being processed.
   */
  isPathArbitraryLengthDistinctKey: new ActionContextKey<boolean>(
    '@comunica/bus-query-operation:isPathArbitraryLengthDistinct',
  ),
  /**
   * An indicator that the stream will be limited to the given number of elements afterwards.
   */
  limitIndicator: new ActionContextKey<number>('@comunica/bus-query-operation:limitIndicator'),
  /**
   * If the default graph should also contain the union of all named graphs.
   */
  unionDefaultGraph: new ActionContextKey<boolean>('@comunica/bus-query-operation:unionDefaultGraph'),
  /**
   * The sources to query over.
   */
  querySources: new ActionContextKey<IQuerySourceWrapper[]>('@comunica/bus-query-operation:querySources'),
  /**
   * A mapping of SERVICE targets to sources.
   */
  serviceSources: new ActionContextKey<Record<string, IQuerySourceWrapper>>(
    '@comunica/bus-query-operation:serviceSources',
  ),
};

/**
 * Context keys for JSON-LD parsing configuration.
 */
export const KeysRdfParseJsonLd = {
  /**
   * A custom JSON-LD document loader for resolving remote contexts.
   * @range {IDocumentLoader}
   */
  documentLoader: new ActionContextKey<IDocumentLoader>('@comunica/actor-rdf-parse-jsonld:documentLoader'),
  /**
   * Whether strict value validation should be applied during JSON-LD parsing.
   * @range {boolean}
   */
  strictValues: new ActionContextKey<boolean>('@comunica/actor-rdf-parse-jsonld:strictValues'),
  /**
   * Additional options passed to the JSON-LD parser.
   * @range {Record<string, any>}
   */
  parserOptions: new ActionContextKey<Record<string, any>>('@comunica/actor-rdf-parse-jsonld:parserOptions'),
};

/**
 * Context keys for HTML script tag RDF parsing.
 */
export const KeysRdfParseHtmlScript = {
  /**
   * An internal context flag to determine if the engine is already processing an HTML script tag.
   */
  processingHtmlScript: new ActionContextKey<boolean>('@comunica/actor-rdf-parse-html-script:processingHtmlScript'),
  /**
   * If all HTML script tags must be considered.
   */
  extractAllScripts: new ActionContextKey<boolean>('extractAllScripts'),
};

/**
 * Context keys for RDF serialization settings.
 */
export const KeysRdfSerialize = {
  /**
   * Prefixes that will be used by RDF serializers.
   */
  rdfSerializationPrefixes: new ActionContextKey<Record<string, string>>(
    '@comunica/bus-rdf-serialize:rdfSerializationPrefixes',
  ),
};

/**
 * Context keys for query source identification and traversal.
 */
export const KeysQuerySourceIdentify = {
  /**
   * A map containing unique IDs for each source
   */
  sourceIds: new ActionContextKey<Map<QuerySourceReference, string>>(
    '@comunica/bus-query-source-identify:sourceIds',
  ),
  /**
   * If links may be traversed from this source.
   * This means that sources annotated with this flag are considered incomplete until all links have been traversed.
   */
  traverse: new ActionContextKey<boolean>('@comunica/bus-query-source-identify:traverse'),
};

/**
 * Context keys for RDF quad update destinations.
 */
export const KeysRdfUpdateQuads = {
  /**
   * A data destination.
   */
  destination: new ActionContextKey<IDataDestination>('@comunica/bus-rdf-update-quads:destination'),
};

/**
 * Context keys for binding context merging and source tracking.
 */
export const KeysMergeBindingsContext = {
  /**
   * The data sources required to produce the binding
   */
  sourcesBinding: new ActionContextKey<string[]>('@comunica/bus-merge-bindings-context:sourcesBinding'),
};

/**
 * Context keys for RDF join operation state.
 */
export const KeysRdfJoin = {
  /**
   * The last physical join actor that was executed.
   */
  lastPhysicalJoin: new ActionContextKey<string>('@comunica/bus-rdf-join:lastPhysicalJoin'),
};

/**
 * Context keys for query execution statistics collection.
 */
export const KeysStatistics = {
  /**
   * All discovered links during query execution. Not all of them will necessarily be dereferenced.
   */
  discoveredLinks: new ActionContextKey<IStatisticBase<IDiscoverEventData>>(
    '@comunica/statistic:discoveredLinks',
  ),
  /**
   * Information about what links are dereferenced and when
   */
  dereferencedLinks: new ActionContextKey<IStatisticBase<ILink>>(
    '@comunica/statistic:dereferencedLinks',
  ),
  /**
   * Intermediate results produced during query execution
   */
  intermediateResults: new ActionContextKey<IStatisticBase<PartialResult>>(
    '@comunica/statistic:intermediateResults',
  ),
};
