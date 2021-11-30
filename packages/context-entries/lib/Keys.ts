export enum KeysCore {
  /**
   * @range {Logger} A logger instance.
   */
  log = '@comunica/core:log',
}

export enum KeysHttp {
  /**
   * @range {boolean} Include credentials flags.
   */
  includeCredentials = '@comunica/bus-http:include-credentials',
  /**
   * @range {string} Authentication for a source as a "username:password"-pair.
   */
  auth = '@comunica/bus-http:auth',
  /**
   * @range {(input: RequestInfo, init?: RequestInit) => Promise<Response>} Fetch function implementation.
   */
  fetch = '@comunica/bus-http:fetch',
}

export enum KeysHttpMemento {
  /**
   * @range {string} The desired datetime for Memento datetime-negotiation.
   */
  datetime = '@comunica/actor-http-memento:datetime',
}

export enum KeysHttpProxy {
  /**
   * @range {IProxyHandler} A handler implementing the {@link IProxyHandler} interface.
   */
  httpProxyHandler = '@comunica/actor-http-proxy:httpProxyHandler',
}

export enum KeysInitSparql {
  /**
   * @range {Bindings} Variables that have to be pre-bound to values in the query.
   */
  initialBindings = '@comunica/actor-init-sparql:initialBindings',
  /**
   * @range {string} Name of the provided query's format.
   */
  queryFormat = '@comunica/actor-init-sparql:queryFormat',
  /**
   * @range {any} Which GraphQL bindings should be singularized.
   */
  graphqlSingularizeVariables = '@comunica/actor-init-sparql:singularizeVariables',
  /**
   * @range {boolean} If HTTP and parsing failures are ignored.
   */
  lenient = '@comunica/actor-init-sparql:lenient',
  /**
   * @range {string} The original query string.
   */
  queryString = '@comunica/actor-init-sparql:queryString',
  /**
   * @range {Algebra.Operation} The original parsed query.
   */
  query = '@comunica/actor-init-sparql:query',
  /**
   * @range {string} The query's base IRI.
   */
  baseIRI = '@comunica/actor-init-sparql:baseIRI',
  /**
   * @range {Date} A timestamp representing the current time.
   *                 This is required for certain SPARQL operations such as NOW().
   */
  queryTimestamp = '@comunica/actor-init-sparql:queryTimestamp',
  /**
   * @range {functionNamedNode: RDF.NamedNode) => ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined}
   * Extension function creator for a given function IRI.
   * Returned value should be an async function implementation.
   * Undefined may be returned if no implementation exists for the given function IRI.
   *
   * The dictionary-based extensionFunctions context entry may be used instead, but not simultaneously.
   */
  extensionFunctionCreator = '@comunica/actor-init-sparql:extensionFunctionCreator',
  /**
   * @range {Record<string, (args: RDF.Term[]) => Promise<RDF.Term>>} Dictionary of extension functions.
   * Key is the IRI of the function, and value is the async function implementation.
   *
   * The callback-based extensionFunctionCreator context entry may be used instead, but not simultaneously.
   */
  extensionFunctions = '@comunica/actor-init-sparql:extensionFunctions',
  /**
   * @range {ICliArgsHandler[]} Enables manipulation of the CLI arguments and their processing.
   */
  cliArgsHandlers = '@comunica/actor-init-sparql:cliArgsHandlers',
  /**
   * @range {string} Explain mode of the query. Can be 'parsed', 'logical', or 'physical'.
   */
  explain = '@comunica/actor-init-sparql:explain',
  /**
   * @range {IPhysicalQueryPlanLogger} Logs the used physical operators
   */
  physicalQueryPlanLogger = '@comunica/actor-init-sparql:physicalQueryPlanLogger',
  /**
   * @range {any} The current physical operator within the query plan.
   *              This is used to pass parent-child relationships for invoking the query plan logger.
   */
  physicalQueryPlanNode = '@comunica/actor-init-sparql:physicalQueryPlanNode',
}

export enum KeysQueryOperation {
  /**
   * @range {string} Context entry for the current query operation.
   */
  operation = '@comunica/bus-query-operation:operation',
  /**
   * @type {any} The metadata from the left streams within a join operation.
   */
  joinLeftMetadata = '@comunica/bus-query-operation:joinLeftMetadata',
  /**
   * @range {any[]} An array of metadata from the right streams within a join operation.
   */
  joinRightMetadatas = '@comunica/bus-query-operation:joinRightMetadatas',
  /**
   * @range {Bindings} Indicates the bindings that were used to bind the operation.
   */
  joinBindings = '@comunica/bus-query-operation:joinBindings',
  /**
   * @range {boolean} Flag for indicating that only read operations are allowed, defaults to false.
   */
  readOnly = '@comunica/bus-query-operation:readOnly',
}

export enum KeysRdfParseJsonLd {
  /**
   * @range {IDocumentLoader}
   */
  documentLoader = '@comunica/actor-rdf-parse-jsonld:documentLoader',
  /**
   * @range {boolean}
   */
  strictValues = '@comunica/actor-rdf-parse-jsonld:strictValues',
  /**
   * @range {Record<string, any>}
   */
  parserOptions = '@comunica/actor-rdf-parse-jsonld:parserOptions',
}

export enum KeysRdfResolveQuadPattern {
  /**
   * @range {DataSources} Data sources.
   */
  sources = '@comunica/bus-rdf-resolve-quad-pattern:sources',
  /**
   * @range {IDataSource} A data source.
   */
  source = '@comunica/bus-rdf-resolve-quad-pattern:source',
}

export enum KeysRdfUpdateQuads {
  /**
   * @range {IDataDestination} A data destination.
   */
  destination = '@comunica/bus-rdf-update-quads:destination',
}
