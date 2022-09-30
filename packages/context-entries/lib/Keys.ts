import { ActionContextKey, CONTEXT_KEY_LOGGER } from '@comunica/core';
import type { Bindings,
  IPhysicalQueryPlanLogger,
  QueryExplainMode,
  IProxyHandler,
  ICliArgsHandler,
  DataSources,
  IDataSource,
  IDataDestination,
  MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { IDocumentLoader } from 'jsonld-context-parser';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * When adding entries to this file, also add a shortcut for them in the contextKeyShortcuts TSDoc comment in
 * ActorIniQueryBase in @comunica/actor-init-query if it makes sense to use this entry externally.
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
  httpRetryOnServerError: new ActionContextKey<number>('@comunica/bus-http:http-retry-on-server-error'),
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
   * A timestamp representing the current time.
   *                 This is required for certain SPARQL operations such as NOW().
   */
  queryTimestamp: new ActionContextKey<Date>('@comunica/actor-init-query:queryTimestamp'),
  /**
   * @range {functionNamedNode: RDF.NamedNode) => ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined}
   * Extension function creator for a given function IRI.
   * Returned value should be an async function implementation.
   * Undefined may be returned if no implementation exists for the given function IRI.
   *
   * The dictionary-based extensionFunctions context entry may be used instead, but not simultaneously.
   */
  extensionFunctionCreator: new ActionContextKey<
  (functionNamedNode: RDF.NamedNode) => ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined
  // eslint-disable-next-line @typescript-eslint/no-extra-parens
  >('@comunica/actor-init-query:extensionFunctionCreator'),
  /**
   * Dictionary of extension functions.
   * Key is the IRI of the function, and value is the async function implementation.
   *
   * The callback-based extensionFunctionCreator context entry may be used instead, but not simultaneously.
   */
  extensionFunctions: new ActionContextKey<
  Record<string, (args: RDF.Term[]) => Promise<RDF.Term>>
  // eslint-disable-next-line @typescript-eslint/no-extra-parens
  >('@comunica/actor-init-query:extensionFunctions'),
  /**
   * Enables manipulation of the CLI arguments and their processing.
   */
  cliArgsHandlers: new ActionContextKey<ICliArgsHandler[]>('@comunica/actor-init-query:cliArgsHandlers'),
  /**
   * Explain mode of the query. Can be 'parsed', 'logical', or 'physical'.
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
};

export const KeysQueryOperation = {
  /**
   * Context entry for the current query operation.
   */
  operation: new ActionContextKey<string>('@comunica/bus-query-operation:operation'),
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
   * An indicator that the operator should apply blank node localization
   */
  localizeBlankNodes: new ActionContextKey<boolean>('@comunica/actor-query-operation:localizeBlankNodes'),
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

export const KeysRdfResolveQuadPattern = {
  /**
   * Data sources.
   */
  sources: new ActionContextKey<DataSources>('@comunica/bus-rdf-resolve-quad-pattern:sources'),
  /**
   * A data source.
   */
  source: new ActionContextKey<IDataSource>('@comunica/bus-rdf-resolve-quad-pattern:source'),
  /**
   * A map containing unique IDs for each source
   */
  sourceIds: new ActionContextKey<Map<IDataSource, string>>('@comunica/bus-rdf-resolve-quad-pattern:sourceIds'),
};

export const KeysRdfUpdateQuads = {
  /**
   * A data destination.
   */
  destination: new ActionContextKey<IDataDestination>('@comunica/bus-rdf-update-quads:destination'),
};
