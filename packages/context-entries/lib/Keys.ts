import { ActionContextKey, CONTEXT_KEY_LOGGER } from '@comunica/core';
import type {
  AsyncExtensionFunctionCreator,
  Bindings,
  FunctionArgumentsCache,
  IActionContext,
  IAggregatedStore,
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
  ILink,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { IDocumentLoader } from 'jsonld-context-parser';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * When adding entries to this file, also add a shortcut for them in the contextKeyShortcuts TSDoc comment in
 * ActorInitQueryBase in @comunica/actor-init-query if it makes sense to use this entry externally.
 * Also, add this shortcut to IQueryContextCommon in @comunica/types.
 */

export const KeysCore = {
  // We create the core context keys in @comunica/core to avoid a cyclic dependency
  /**
   * A logger instance.
   */
  log: CONTEXT_KEY_LOGGER,
};

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
   * Delay in milliseconds to wait between fetch retries. Requires httpRetryCount to be set.
   */
  httpRetryDelay: new ActionContextKey<number>('@comunica/bus-http:http-retry-delay'),
  /**
   * Retry fetch, if server replies with a 5xx error response. Requires httpRetryCount to be set.
   */
  httpRetryOnServerError: new ActionContextKey<boolean>('@comunica/bus-http:http-retry-on-server-error'),
};

export const KeysHttpWayback = {
  /**
   * Use the WayBack machine to get the most recent representation of a file if a link is broken.
   * @default false
   */
  recoverBrokenLinks: new ActionContextKey<boolean>('@comunica/bus-http:recover-broken-links'),
};

export const KeysHttpMemento = {
  /**
   * The desired datetime for Memento datetime-negotiation.
   */
  datetime: new ActionContextKey<Date>('@comunica/actor-http-memento:datetime'),
};

export const KeysHttpProxy = {
  /**
   * Interface.
   */
  httpProxyHandler: new ActionContextKey<IProxyHandler>('@comunica/actor-http-proxy:httpProxyHandler'),
};

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
   * Enables manipulation of the CLI arguments and their processing.
   */
  cliArgsHandlers: new ActionContextKey<ICliArgsHandler[]>('@comunica/actor-init-query:cliArgsHandlers'),
  /**
   * Explain mode of the query. Can be 'parsed', 'logical', 'physical', or 'physical-json'.
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

export const KeysExpressionEvaluator = {
  extensionFunctionCreator: new ActionContextKey<AsyncExtensionFunctionCreator>(
    '@comunica/expression-evaluator:extensionFunctionCreator',
  ),
  superTypeProvider: new ActionContextKey<ISuperTypeProvider>('@comunica/expression-evaluator:superTypeProvider'),
  defaultTimeZone: new ActionContextKey<ITimeZoneRepresentation>('@comunica/expression-evaluator:defaultTimeZone'),
  actionContext: new ActionContextKey<IActionContext>('@comunica/expression-evaluator:actionContext'),
};

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
};

export const KeysRdfParseJsonLd = {
  /**
   * @range {IDocumentLoader}
   */
  documentLoader: new ActionContextKey<IDocumentLoader>('@comunica/actor-rdf-parse-jsonld:documentLoader'),
  /**
   * @range {boolean}
   */
  strictValues: new ActionContextKey<boolean>('@comunica/actor-rdf-parse-jsonld:strictValues'),
  /**
   * @range {Record<string, any>}
   */
  parserOptions: new ActionContextKey<Record<string, any>>('@comunica/actor-rdf-parse-jsonld:parserOptions'),
};

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

export const KeysQuerySourceIdentify = {
  /**
   * A map containing unique IDs for each source
   */
  sourceIds: new ActionContextKey<Map<QuerySourceReference, string>>(
    '@comunica/bus-query-source-identify:sourceIds',
  ),
  /**
   * Hypermedia sources mapping to their aggregated store.
   */
  hypermediaSourcesAggregatedStores: new ActionContextKey<Map<string, IAggregatedStore>>(
    '@comunica/bus-query-source-identify:hypermediaSourcesAggregatedStores',
  ),
  /**
   * If links may be traversed from this source.
   * This means that sources annotated with this flag are considered incomplete until all links have been traversed.
   */
  traverse: new ActionContextKey<boolean>('@comunica/bus-query-source-identify:traverse'),
};

export const KeysRdfUpdateQuads = {
  /**
   * A data destination.
   */
  destination: new ActionContextKey<IDataDestination>('@comunica/bus-rdf-update-quads:destination'),
};

export const KeysMergeBindingsContext = {
  /**
   * The data sources required to produce the binding
   */
  sourcesBinding: new ActionContextKey<string[]>('@comunica/bus-merge-bindings-context:sourcesBinding'),
};

export const KeysRdfJoin = {
  /**
   * The last physical join actor that was executed.
   */
  lastPhysicalJoin: new ActionContextKey<string>('@comunica/bus-rdf-join:lastPhysicalJoin'),
};

export const KeysStatistics = {
  /**
   * All discovered links during query execution. Not all of them will necessarily be dereferenced.
   */
  discoveredLinks: new ActionContextKey<IStatisticBase<IDiscoverEventData>>(
    '@comunica/bus-context-preprocess:discoveredLinks',
  ),
  /**
   * Information about what links are dereferenced and when
   */
  dereferencedLinks: new ActionContextKey<IStatisticBase<ILink>>(
    '@comunica/bus-context-preprocess:dereferencedLinks',
  ),
};
