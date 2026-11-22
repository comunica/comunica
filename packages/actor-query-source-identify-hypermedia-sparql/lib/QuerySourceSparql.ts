import type { MediatorHttp } from '@comunica/bus-http';
import type { MediatorQuerySerialize } from '@comunica/bus-query-serialize';
import { KeysHttp, KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { Actor } from '@comunica/core';
import type {
  Bindings,
  BindingsStream,
  ComunicaDataFactory,
  FragmentSelectorShape,
  IActionContext,
  IDataset,
  IPhysicalQueryPlanNode,
  IQueryBindingsOptions,
  IQuerySource,
  MetadataBindings,
  MetadataVariable,
  QueryResultCardinality,
} from '@comunica/types';
import type { AlgebraFactory } from '@comunica/utils-algebra';
import { Algebra, algebraUtils, isKnownOperation, TypesComunica } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState, onFirstMetadataRequest } from '@comunica/utils-metadata';
import {
  estimateCardinality,
  getOperationEquivalentQueryString,
  getOriginalSparqlQueryString,
} from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { Parser as SparqlParser } from '@traqula/parser-sparql-1-2';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, TransformIterator, wrap } from 'asynciterator';
import type { ISparqlEndpointFetcherRequestOptions } from 'fetch-sparql-endpoint';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { LRUCache } from 'lru-cache';
import { uniqTerms } from 'rdf-terms';
import type { BindMethod } from './ActorQuerySourceIdentifyHypermediaSparql';
import { SparqlRequestSharing } from './SparqlRequestSharing';

export class QuerySourceSparql implements IQuerySource {
  /**
   * The query format that endpoints advertise via the `Accept-Query` header when they support HTTP QUERY (RFC 10008).
   */
  public static readonly MEDIATYPE_SPARQL_QUERY = 'application/sparql-query';
  /**
   * The SPARQL query parser of all endpoint fetchers, as creating one takes tens of milliseconds.
   */
  private static sparqlQueryParser: SparqlParser | undefined;

  public readonly referenceValue: string;
  private url: string;
  private readonly urlBackup: string;
  private readonly context: IActionContext;
  private readonly mediatorHttp: MediatorHttp;
  private readonly mediatorQuerySerialize: MediatorQuerySerialize;
  private readonly bindMethod: BindMethod;
  private readonly countTimeout: number;
  private readonly cardinalityCountQueries: boolean;
  private readonly cardinalityEstimateConstruction: boolean;
  private readonly defaultGraph?: string;
  private readonly unionDefaultGraph: boolean;
  private readonly propertyFeatures?: Set<string>;
  private readonly datasets?: IDataset[];
  public readonly extensionFunctions?: string[];
  private readonly dataFactory: ComunicaDataFactory;
  private readonly algebraFactory: AlgebraFactory;
  private readonly bindingsFactory: BindingsFactory;

  private readonly endpointFetcher: SparqlEndpointFetcher;
  private readonly cache: LRUCache<string, QueryResultCardinality> | undefined;

  /**
   * The number of HTTP requests made for each physical query plan node.
   */
  private readonly httpRequestsByPlanNode = new WeakMap<IPhysicalQueryPlanNode, number>();
  private httpQueryMethodRejected = false;
  private readonly batchAskQueries: boolean;
  private readonly countFallback?: ICountFallback;
  /**
   * The ASK queries that wait to be sent in a single request, if ASK queries are batched.
   */
  private askBatch: IAskBatchEntry[] | undefined;
  private readonly requestSharing: SparqlRequestSharing;
  private readonly resultPageMultiple: number;

  public constructor(
    url: string,
    urlBackup: string,
    context: IActionContext,
    mediatorHttp: MediatorHttp,
    mediatorQuerySerialize: MediatorQuerySerialize,
    bindMethod: BindMethod,
    dataFactory: ComunicaDataFactory,
    algebraFactory: AlgebraFactory,
    bindingsFactory: BindingsFactory,
    forceHttpGet: boolean,
    cacheSize: number,
    countTimeout: number,
    cardinalityCountQueries: boolean,
    cardinalityEstimateConstruction: boolean,
    forceGetIfUrlLengthBelow: number,
    parseUnsupportedVersions: boolean,
    metadata: Record<string, any>,
    batchAskQueries = false,
    countFallback?: ICountFallback,
    shareRequestsMaxBindings = 0,
    resultPageMultiple = 0,
  ) {
    this.referenceValue = urlBackup;
    this.url = url;
    this.urlBackup = urlBackup;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
    this.mediatorQuerySerialize = mediatorQuerySerialize;
    this.bindMethod = bindMethod;
    this.dataFactory = dataFactory;
    this.algebraFactory = algebraFactory;
    this.bindingsFactory = bindingsFactory;

    // Endpoints advertise support for the HTTP QUERY method (RFC 10008) via the Accept-Query header,
    // which lets us send the query in the request body without the side effects of a POST.
    let method: 'GET' | 'POST' | 'QUERY' = 'POST';
    if (forceHttpGet) {
      method = 'GET';
    } else if (metadata.queryAccepted?.includes(QuerySourceSparql.MEDIATYPE_SPARQL_QUERY)) {
      method = 'QUERY';
    }

    this.endpointFetcher = new SparqlEndpointFetcher({
      method,
      prefixVariableQuestionMark: true,
      dataFactory,
      forceGetIfUrlLengthBelow,
      directPost: metadata.postAccepted && !metadata.postAccepted.includes('application/x-www-form-urlencoded'),
      parseUnsupportedVersions,
      sparqlQueryParser: QuerySourceSparql.getSparqlQueryParser(),
    });
    this.cache = cacheSize > 0 ?
      new LRUCache<string, QueryResultCardinality>({ max: cacheSize }) :
      undefined;
    this.countTimeout = countTimeout;
    this.cardinalityCountQueries = cardinalityCountQueries;
    this.cardinalityEstimateConstruction = cardinalityEstimateConstruction;
    this.defaultGraph = metadata.defaultGraph;
    this.unionDefaultGraph = metadata.unionDefaultGraph ?? false;
    this.datasets = metadata.datasets;
    this.extensionFunctions = metadata.extensionFunctions;
    this.propertyFeatures = metadata.propertyFeatures ? new Set(metadata.propertyFeatures) : undefined;
    this.batchAskQueries = batchAskQueries;
    this.countFallback = countFallback;
    this.requestSharing = new SparqlRequestSharing(shareRequestsMaxBindings);
    this.resultPageMultiple = resultPageMultiple;
  }

  /**
   * Create the options for requests to the endpoint on behalf of the given context,
   * so that each request is sent with the context of the query that issued it.
   * @param context The context of the query operation for which requests are sent.
   */
  protected getRequestOptions(context: IActionContext): ISparqlEndpointFetcherRequestOptions {
    return { fetch: (input: Request | string, init?: RequestInit) => this.fetch(input, init, context) };
  }

  /**
   * Send an HTTP request to the endpoint.
   * @param input The request input.
   * @param init The request options.
   * @param context The context of the query operation for which the request is sent.
   */
  protected async fetch(input: Request | string, init: RequestInit | undefined, context: IActionContext):
  Promise<Response> {
    // The advertisement may be stale, or an intermediary may not know the method,
    // in which case we permanently fall back to a direct POST, which carries an identical body.
    if (this.httpQueryMethodRejected && init?.method === 'QUERY') {
      init = { ...init, method: 'POST' };
    }

    this.countHttpRequest(context);
    let response = await this.mediatorHttp.mediate({ input, init, context });
    // If we encounter a 404, try our backup URL.
    // After retrying the request with the new URL, we replace the URL for future requests.
    if (response.status === 404 && this.url !== this.urlBackup) {
      Actor.getContextLogger(this.context)?.warn(`Encountered a 404 when requesting ${this.url} according to the service description of ${this.urlBackup}. This is a server configuration issue. Retrying the current and modifying future requests to ${this.urlBackup} instead.`);
      input = (<string> input).replace(this.url, this.urlBackup);
      this.url = this.urlBackup;
      this.countHttpRequest(context);
      response = await this.mediatorHttp.mediate({ input, init, context });
    }

    if (init?.method === 'QUERY' && (response.status === 405 || response.status === 501)) {
      Actor.getContextLogger(this.context)?.warn(`Encountered a ${response.status} for an HTTP QUERY request to ${this.url}, even though it advertises support for it via the Accept-Query header. Retrying the current and modifying future requests to use POST instead.`);
      this.httpQueryMethodRejected = true;
      this.countHttpRequest(context);
      response = await this.mediatorHttp.mediate({ input, init: { ...init, method: 'POST' }, context });
    }

    return response;
  }

  public async getFilterFactor(): Promise<number> {
    return 1;
  }

  /**
   * Get the SPARQL query parser that is shared by all endpoint fetchers.
   */
  public static getSparqlQueryParser(): SparqlParser {
    QuerySourceSparql.sparqlQueryParser ??= new SparqlParser({ lexerConfig: { positionTracking: 'onlyOffset' }});
    return QuerySourceSparql.sparqlQueryParser;
  }

  public async getSelectorShape(): Promise<FragmentSelectorShape> {
    const innerDisjunction: FragmentSelectorShape = {
      type: 'disjunction',
      children: [
        {
          type: 'operation',
          operation: { operationType: 'wildcard' },
          joinBindings: true,
        },
      ],
    };
    if (this.extensionFunctions) {
      innerDisjunction.children.push({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.Types.EXPRESSION,
          extensionFunctions: this.extensionFunctions,
        },
        joinBindings: true,
      });
    }
    return {
      type: 'conjunction',
      children: [
        innerDisjunction,
        {
          // DISTINCT CONSTRUCT is not allowed in SPARQL 1.1, so we explicitly disallowed it.
          type: 'negation',
          child: {
            type: 'operation',
            operation: { operationType: 'type', type: Algebra.Types.DISTINCT },
            children: [
              {
                type: 'operation',
                operation: { operationType: 'type', type: Algebra.Types.CONSTRUCT },
                children: [
                  {
                    type: 'operation',
                    operation: { operationType: 'wildcard' },
                    joinBindings: true,
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  }

  /**
   * Report the query that is sent to the endpoint to the physical query plan, if one is being logged.
   * @param context The context of the current operation.
   * @param query The query that is sent to the endpoint.
   */
  protected reportSourceQuery(context: IActionContext, query: string): void {
    context.get(KeysInitQuery.physicalQueryPlanNode)?.appendMetadata({ sourceQuery: query });
  }

  /**
   * Count an HTTP request against the physical query plan node of the operation it is made on behalf of.
   * @param context The context of the operation for which the request is sent.
   */
  protected countHttpRequest(context: IActionContext): void {
    const planNode = context.get(KeysInitQuery.physicalQueryPlanNode);
    if (planNode) {
      const httpRequests = (this.httpRequestsByPlanNode.get(planNode) ?? 0) + 1;
      this.httpRequestsByPlanNode.set(planNode, httpRequests);
      planNode.appendMetadata({ httpRequests });
    }
  }

  public queryBindings(
    operationIn: Algebra.Operation,
    context: IActionContext,
    options?: IQueryBindingsOptions,
  ): BindingsStream {
    // Blank nodes in a SPARQL query are variables, so a blank node from an earlier result can not be referred to.
    if (QuerySourceSparql.hasBlankNodeTerms(operationIn)) {
      const empty = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
      empty.setProperty('metadata', {
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: 0, dataset: this.url },
        variables: algebraUtils.inScopeVariables(operationIn).map(variable => ({ variable, canBeUndef: false })),
      });
      return empty;
    }

    // If bindings are passed, modify the operations
    let operationPromise: Promise<Algebra.Operation>;
    if (options?.joinBindings) {
      operationPromise = QuerySourceSparql.addBindingsToOperation(
        this.algebraFactory,
        this.bindMethod,
        operationIn,
        options.joinBindings,
      );
    } else {
      operationPromise = Promise.resolve(operationIn);
    }

    const bindings: BindingsStream = new TransformIterator(async() => {
      // Prepare queries
      const operation = await operationPromise;
      const variables: RDF.Variable[] = algebraUtils.inScopeVariables(operation);
      // Join bindings modify the operation, so it is no longer equivalent to the original query string.
      const queryString = options?.joinBindings ? undefined : QuerySourceSparql.getQueryStringAsIs(operation, context);
      const selectQuery: string = queryString ??
        await this.operationToSelectQuery(this.algebraFactory, operation, variables);
      const undefVariables = QuerySourceSparql.getOperationUndefs(operation);

      this.reportSourceQuery(context, selectQuery);
      const results = await this.requestSharing.shareBindings(
        context.get(KeysInitQuery.queryTimestamp),
        `select ${selectQuery}`,
        () => this.queryBindingsRemote(this.url, selectQuery, variables, context, undefVariables),
      );
      // Original queries and queries with their own slice are not paged, as their results must not be changed.
      if (queryString !== undefined || this.resultPageMultiple <= 0 ||
        isKnownOperation(operation, Algebra.Types.SLICE)) {
        return results;
      }
      return this.continuePages(results, operation, variables, context, undefVariables, 0);
    }, { autoStart: false });
    this.attachMetadata(bindings, context, operationPromise);

    return bindings;
  }

  /**
   * Check if the given operation contains blank nodes as terms, such as from a binding that was bound into it.
   * Blank nodes are variables in a SPARQL query, so a blank node from an earlier result can not be referred to,
   * and an operation with such blank nodes can not have results in this source.
   * @param operation An operation.
   */
  public static hasBlankNodeTerms(operation: Algebra.Operation): boolean {
    let found = false;
    const check = (terms: RDF.Term[]): void => {
      if (terms.some(term => term.termType === 'BlankNode')) {
        found = true;
      }
    };
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.PATTERN]: {
        preVisitor: (pattern: Algebra.Pattern) => {
          check([ pattern.subject, pattern.predicate, pattern.object, pattern.graph ]);
          return { continue: !found };
        },
      },
      [Algebra.Types.PATH]: {
        preVisitor: (path: Algebra.Path) => {
          check([ path.subject, path.object, path.graph ]);
          return { continue: !found };
        },
      },
    });
    return found;
  }

  /**
   * Continue the given results of an operation with further pages, if they may have been capped by the endpoint.
   *
   * Some endpoints silently return at most a fixed number of results, such as 10,000, regardless of the query.
   * Results of which the number is a multiple of resultPageMultiple may be capped,
   * so they are continued with pages of that number of results, using OFFSET, until a page has fewer results.
   * If the results were not capped, this costs one request with no results.
   * Pages are not ordered, as such endpoints may refuse to sort that many results,
   * so they rely on the endpoint to evaluate the same query in the same order.
   *
   * @param page The results of the operation from the given offset.
   * @param operation The operation.
   * @param variables The variables of the operation.
   * @param context The action context.
   * @param undefVariables Variables that may have undefs.
   * @param offset The offset of the given results.
   * @param pageSize The number of results per page, or undefined if the given results are the first ones.
   */
  protected continuePages(
    page: BindingsStream,
    operation: Algebra.Operation,
    variables: RDF.Variable[],
    context: IActionContext,
    undefVariables: RDF.Variable[],
    offset: number,
    pageSize?: number,
  ): BindingsStream {
    let count = 0;
    const counted = page.map((bindings) => {
      count++;
      return bindings;
    });
    const next = new TransformIterator<RDF.Bindings>(async() => {
      const capped = pageSize === undefined ? count > 0 && count % this.resultPageMultiple === 0 : count === pageSize;
      if (!capped) {
        return new ArrayIterator<RDF.Bindings>([], { autoStart: false });
      }
      const nextOffset = offset + count;
      const query = await this.operationToQuery(this.algebraFactory.createSlice(
        this.algebraFactory.createProject(operation, variables),
        nextOffset,
        count,
      ));
      this.reportSourceQuery(context, query);
      const results = await this.queryBindingsRemote(this.url, query, variables, context, undefVariables);
      return this.continuePages(results, operation, variables, context, undefVariables, nextOffset, count);
    }, { autoStart: false });
    return counted.append(next);
  }

  public queryQuads(operation: Algebra.Operation, context: IActionContext): AsyncIterator<RDF.Quad> {
    const quads = wrap<any>((async() => {
      const query: string = QuerySourceSparql.getQueryStringAsIs(operation, context) ??
        await this.operationToQuery(operation);
      this.reportSourceQuery(context, query);
      const rawStream = await this.endpointFetcher.fetchTriples(this.url, query, this.getRequestOptions(context));
      return rawStream;
    })(), { autoStart: false, maxBufferSize: Number.POSITIVE_INFINITY });
    this.attachMetadata(quads, context, Promise.resolve((<Algebra.Operation & { input: any }>operation).input));
    return quads;
  }

  public async queryBoolean(operation: Algebra.Ask, context: IActionContext): Promise<boolean> {
    // Shortcut the ASK query to return true when supported propertyFeature predicates are used in it.
    if (this.operationUsesPropertyFeatures(operation)) {
      return true;
    }
    // Without propertyFeature overlap, perform the actual ASK query.
    const queryAsIs = QuerySourceSparql.getQueryStringAsIs(operation, context);
    if (this.batchAskQueries && !queryAsIs) {
      return new Promise<boolean>((resolve, reject) => {
        if (!this.askBatch) {
          this.askBatch = [];
          setImmediate(() => this.sendAskBatch());
        }
        this.askBatch.push({ operation, context, resolve, reject });
      });
    }
    return this.sendAsk(operation, context, queryAsIs);
  }

  protected async sendAsk(operation: Algebra.Ask, context: IActionContext, queryAsIs?: string): Promise<boolean> {
    const query = queryAsIs ?? await this.operationToQuery(operation);
    this.reportSourceQuery(context, query);
    return this.endpointFetcher.fetchAsk(this.url, query, this.getRequestOptions(context));
  }

  /**
   * Send the ASK queries that were issued in the same tick, such as for source selection, in a single SELECT query,
   * which binds one variable per ASK query to whether its operation has results.
   */
  protected sendAskBatch(): void {
    const batch = this.askBatch!;
    this.askBatch = undefined;
    const answers = batch.length === 1 ?
      this.sendAsk(batch[0].operation, batch[0].context).then(answer => [ answer ]) :
      this.sendAskQueriesAsSelect(batch);
    answers.then(
      (values) => {
        for (const [ index, entry ] of batch.entries()) {
          entry.resolve(values[index]);
        }
      },
      (error: unknown) => {
        for (const entry of batch) {
          entry.reject(error);
        }
      },
    );
  }

  /**
   * Send the given ASK queries in a single SELECT query.
   * @param batch The ASK queries.
   * @return The answer to each ASK query.
   */
  protected async sendAskQueriesAsSelect(batch: IAskBatchEntry[]): Promise<boolean[]> {
    const variables = batch.map((_, index) => this.dataFactory.variable(`ask${index}`));
    let operation: Algebra.Operation = this.algebraFactory.createBgp([]);
    for (const [ index, entry ] of batch.entries()) {
      // Some endpoints correlate equally named variables of different EXISTS expressions,
      // so the variables of each ASK query are made unique.
      const input = QuerySourceSparql.renameVariables(
        entry.operation.input,
        variable => this.dataFactory.variable(`${variable.value}_b${index}`),
        this.dataFactory,
      );
      operation = this.algebraFactory.createExtend(
        operation,
        variables[index],
        this.algebraFactory.createExistenceExpression(false, input),
      );
    }
    const query = await this.operationToQuery(this.algebraFactory.createProject(operation, variables));
    for (const entry of batch) {
      this.reportSourceQuery(entry.context, query);
    }

    // Each ASK query may be aborted, e.g., on a timeout, so only abort the request once all of them are.
    const abortSignal = QuerySourceSparql
      .abortSignalOfAll(batch.map(entry => entry.context.get(KeysHttp.httpAbortSignal)));
    const context = abortSignal ?
      batch[0].context.set(KeysHttp.httpAbortSignal, abortSignal) :
      batch[0].context.delete(KeysHttp.httpAbortSignal);
    const bindings = await (await this.queryBindingsRemote(this.url, query, variables, context, [])).toArray();
    return variables.map((variable) => {
      // Without a valid answer, assume that the operation has results, so that it is not pruned.
      const value = bindings[0]?.get(variable)?.value;
      return value !== 'false' && value !== '0';
    });
  }

  /**
   * Rename all variables in the given operation.
   * @param operation An operation.
   * @param rename A function that maps each variable to a new variable.
   * @param dataFactory The data factory.
   * @return The operation with renamed variables.
   */
  public static renameVariables(
    operation: Algebra.Operation,
    rename: (variable: RDF.Variable) => RDF.Variable,
    dataFactory: ComunicaDataFactory,
  ): Algebra.Operation {
    const renameTerm = <T extends RDF.Term>(term: T): T => {
      if (term.termType === 'Variable') {
        return <T> rename(term);
      }
      if (term.termType === 'Quad') {
        const quad = <RDF.Quad> <RDF.Term> term;
        return <T> dataFactory.quad(
          renameTerm(quad.subject),
          renameTerm(quad.predicate),
          renameTerm(quad.object),
          renameTerm(quad.graph),
        );
      }
      return term;
    };
    return algebraUtils.mapOperation(operation, {
      [Algebra.Types.PATTERN]: { transform: op => ({
        ...op,
        subject: renameTerm(op.subject),
        predicate: renameTerm(op.predicate),
        object: renameTerm(op.object),
        graph: renameTerm(op.graph),
      }) },
      [Algebra.Types.PATH]: { transform: op => ({
        ...op,
        subject: renameTerm(op.subject),
        object: renameTerm(op.object),
        graph: renameTerm(op.graph),
      }) },
      [Algebra.Types.EXTEND]: { transform: op => ({ ...op, variable: rename(op.variable) }) },
      [Algebra.Types.PROJECT]: { transform: op => ({ ...op, variables: op.variables.map(rename) }) },
      [Algebra.Types.GROUP]: { transform: op => ({ ...op, variables: op.variables.map(rename) }) },
      [Algebra.Types.GRAPH]: { transform: op => ({ ...op, name: renameTerm(op.name) }) },
      [Algebra.Types.SERVICE]: { transform: op => ({ ...op, name: renameTerm(op.name) }) },
      [Algebra.Types.VALUES]: { transform: op => ({
        ...op,
        variables: op.variables.map(rename),
        bindings: op.bindings.map(binding => Object.fromEntries(Object.entries(binding)
          .map(([ key, value ]) => [ rename(dataFactory.variable(key)).value, value ]))),
      }) },
      [TypesComunica.NODES]: { transform: op => ({
        ...op,
        graph: renameTerm(op.graph),
        variable: rename(op.variable),
      }) },
      [Algebra.Types.EXPRESSION]: { transform: (op) => {
        if (op.subType === Algebra.ExpressionTypes.TERM) {
          return { ...op, term: renameTerm(op.term) };
        }
        // Aggregates of a GROUP are bound to a variable.
        if ('variable' in op) {
          return { ...op, variable: rename(op.variable) };
        }
        return op;
      } },
    });
  }

  /**
   * Create an abort signal that aborts once all given signals have aborted.
   * @param signals Abort signals, of which some may be undefined.
   * @return An abort signal, or undefined if a signal is undefined, as that one is never aborted.
   */
  public static abortSignalOfAll(signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
    if (signals.some(signal => !signal)) {
      return undefined;
    }
    const abortController = new AbortController();
    let pending = signals.length;
    const onAbort = (): void => {
      if (--pending === 0) {
        abortController.abort();
      }
    };
    for (const signal of <AbortSignal[]> signals) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }
    return abortController.signal;
  }

  public async queryVoid(operation: Algebra.Operation, context: IActionContext): Promise<void> {
    const query: string = QuerySourceSparql.getQueryStringAsIs(operation, context) ??
      await this.operationToQuery(operation);
    this.reportSourceQuery(context, query);
    const promise = this.endpointFetcher.fetchUpdate(this.url, query, this.getRequestOptions(context));
    return promise;
  }

  protected attachMetadata(
    target: AsyncIterator<any>,
    context: IActionContext,
    operationPromise: Promise<Algebra.Operation>,
  ): void {
    // The cardinality may require a COUNT query, so it is only determined once the metadata is requested.
    onFirstMetadataRequest(target, () => this.determineMetadata(target, context, operationPromise));
  }

  protected determineMetadata(
    target: AsyncIterator<any>,
    context: IActionContext,
    operationPromise: Promise<Algebra.Operation>,
  ): void {
    // Emit metadata containing the estimated count
    let variablesCount: MetadataVariable[] = [];
    // eslint-disable-next-line no-async-promise-executor,ts/no-misused-promises
    new Promise<QueryResultCardinality>(async(resolve, reject) => {
      try {
        const operation = await operationPromise;
        const variablesScoped = algebraUtils.inScopeVariables(operation);
        const countQuery = await this.operationToNormalizedCountQuery(operation);

        const undefVariables = QuerySourceSparql.getOperationUndefs(operation);
        variablesCount = variablesScoped.map(variable => ({
          variable,
          canBeUndef: undefVariables.some(undefVariable => undefVariable.equals(variable)),
        }));

        const cachedCardinality = this.cache?.get(countQuery);
        if (cachedCardinality) {
          return resolve(cachedCardinality);
        }

        // Attempt to estimate locally prior to sending a COUNT request, as this should be much faster.
        // The estimates may be off by varying amounts, so this is set behind a configuration flag.
        if (this.cardinalityEstimateConstruction) {
          const localEstimate = await this.estimateOperationCardinality(operation);
          if (Number.isFinite(localEstimate.value)) {
            this.cache?.set(countQuery, localEstimate);
            return resolve(localEstimate);
          }
        }

        // Don't send count queries if disabled, or if the endpoint did not answer one in time recently.
        // Cardinalities can be infinity when we're querying just a single source.
        // This is determined per query, as the source can be used by queries with different sources.
        if (!this.cardinalityCountQueries || context.get(KeysQueryOperation.querySources)?.length === 1 ||
          this.countFallback?.isActive(isKnownOperation(operation, Algebra.Types.PATTERN))) {
          return resolve({ type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: this.url });
        }

        // Identical COUNT queries of the same query that are in flight share a single request.
        return resolve(await this.requestSharing.shareValue(
          context.get(KeysInitQuery.queryTimestamp),
          `count ${countQuery}`,
          () => this.sendCountQuery(countQuery, operation, context),
        ));
      } catch (error: unknown) {
        reject(error);
      }
    })
      .then(cardinality => target.setProperty('metadata', {
        state: new MetadataValidationState(),
        cardinality,
        variables: variablesCount,
      }))
      .catch(() => target.setProperty('metadata', {
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: this.url },
        variables: variablesCount,
      }));
  }

  /**
   * Send a COUNT query to the endpoint.
   * If it fails or does not answer within the count timeout, the cardinality is estimated as infinity.
   * @param countQuery A COUNT query with a ?count variable.
   * @param operation The operation that is counted.
   * @param context The action context.
   */
  protected sendCountQuery(
    countQuery: string,
    operation: Algebra.Operation,
    context: IActionContext,
  ): Promise<QueryResultCardinality> {
    // eslint-disable-next-line no-async-promise-executor,ts/no-misused-promises
    return new Promise<QueryResultCardinality>(async(resolve) => {
      const infinite: QueryResultCardinality = { type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: this.url };
      // The count timeout applies from when the request is sent, as it may first wait for the host to be available.
      // On timeout, the request is aborted, so that it does not keep occupying the endpoint.
      const httpTimeout = context.get(KeysHttp.httpTimeout);
      const countContext = context
        .set(KeysHttp.httpTimeout, httpTimeout ? Math.min(httpTimeout, this.countTimeout) : this.countTimeout)
        .set(KeysHttp.httpBodyTimeout, true);
      const varCount = this.dataFactory.variable('count');
      let bindingsStream: BindingsStream;
      try {
        bindingsStream = await this.queryBindingsRemote(this.url, countQuery, [ varCount ], countContext, []);
      } catch {
        this.activateCountFallback(context, operation);
        return resolve(infinite);
      }
      bindingsStream
        .on('data', (bindings: Bindings) => {
          const count = bindings.get(varCount);
          const cardinalityValue = count ? Number.parseInt(count.value, 10) : Number.NaN;
          if (Number.isNaN(cardinalityValue)) {
            return resolve(infinite);
          }
          const cardinality: QueryResultCardinality = { type: 'exact', value: cardinalityValue, dataset: this.url };
          this.cache?.set(countQuery, cardinality);
          resolve(cardinality);
        })
        .on('error', () => {
          resolve(infinite);
          this.activateCountFallback(context, operation);
        })
        .on('end', () => resolve(infinite));
    });
  }

  /**
   * Stop sending COUNT queries to the endpoint for a while, after one failed or took too long,
   * unless the query that sent it was aborted.
   * @param context The context of the query that sent the COUNT query.
   * @param operation The operation of the COUNT query.
   */
  protected activateCountFallback(context: IActionContext, operation: Algebra.Operation): void {
    if (!context.get(KeysHttp.httpAbortSignal)?.aborted) {
      this.countFallback?.activate(isKnownOperation(operation, Algebra.Types.PATTERN));
    }
  }

  /**
   * Convert an algebra operation into a query string, and if the operation is a simple triple pattern,
   * then also replace any variables with s, p, and o to increase the chance of cache hits.
   * @param {Algebra.Operation} operation The operation to convert into a query string.
   * @returns {string} Query string for a COUNT query over the operation.
   */
  public async operationToNormalizedCountQuery(operation: Algebra.Operation): Promise<string> {
    const normalizedOperation = isKnownOperation(operation, Algebra.Types.PATTERN) ?
      this.algebraFactory.createPattern(
        operation.subject.termType === 'Variable' ? this.dataFactory.variable('s') : operation.subject,
        operation.predicate.termType === 'Variable' ? this.dataFactory.variable('p') : operation.predicate,
        operation.object.termType === 'Variable' ? this.dataFactory.variable('o') : operation.object,
      ) :
      operation;
    return await this.operationToCountQuery(
      this.dataFactory,
      this.algebraFactory,
      normalizedOperation,
    );
  }

  /**
   * Performs local cardinality estimation for the specified SPARQL algebra operation, which should
   * result in better estimation performance at the expense of accuracy.
   * @param {Algebra.Operation} operation A query operation.
   */
  public async estimateOperationCardinality(operation: Algebra.Operation): Promise<QueryResultCardinality> {
    if (this.operationUsesPropertyFeatures(operation)) {
      return { type: 'estimate', value: 1, dataset: this.url };
    }

    const dataset: IDataset = {
      getCardinality: async(operation: Algebra.Operation): Promise<QueryResultCardinality | undefined> => {
        const queryString = await this.operationToNormalizedCountQuery(operation);

        const cachedCardinality = this.cache?.get(queryString);
        if (cachedCardinality) {
          return cachedCardinality;
        }

        if (this.datasets) {
          const cardinalities = await Promise.all(this.datasets
            .filter(ds => this.unionDefaultGraph || (this.defaultGraph && ds.uri.endsWith(this.defaultGraph)))
            .map(ds => estimateCardinality(operation, ds)));

          const cardinality: QueryResultCardinality = {
            type: cardinalities.some(card => card.type === 'estimate') ? 'estimate' : 'exact',
            value: cardinalities.length > 0 ? cardinalities.reduce((acc, card) => acc + card.value, 0) : 0,
            dataset: this.url,
          };

          return cardinality;
        }
      },
      source: this.url,
      uri: this.url,
    };

    return estimateCardinality(operation, dataset);
  }

  /**
   * Checks whether the provided operation makes use of this endpoint's property features,
   * if the endpoint has property features detected.
   * @param {Algebra.Operation} operation The operation to check.
   * @returns {boolean} Whether the operation makes use of property features.
   */
  public operationUsesPropertyFeatures(operation: Algebra.Operation): boolean {
    let propertyFeaturesUsed = false;
    if (this.propertyFeatures) {
      algebraUtils.visitOperation(operation, {
        [Algebra.Types.PATTERN]: {
          visitor: (subOp) => {
            if (subOp.predicate.termType === 'NamedNode' && this.propertyFeatures!.has(subOp.predicate.value)) {
              propertyFeaturesUsed = true;
            }
            return false;
          },
        },
        [Algebra.Types.LINK]: {
          visitor: (subOp) => {
            if (this.propertyFeatures!.has(subOp.iri.value)) {
              propertyFeaturesUsed = true;
            }
            return false;
          },
        },
        [Algebra.Types.NPS]: {
          visitor: (subOp) => {
            if (subOp.iris.some(iri => this.propertyFeatures!.has(iri.value))) {
              propertyFeaturesUsed = true;
            }
            return false;
          },
        },
      });
    }
    return propertyFeaturesUsed;
  }

  /**
   * Create an operation that includes the bindings from the given bindings stream.
   * @param algebraFactory The algebra factory.
   * @param bindMethod A method for adding bindings to an operation.
   * @param operation The operation to bind to.
   * @param addBindings The bindings to add.
   * @param addBindings.bindings The bindings stream.
   * @param addBindings.metadata The bindings metadata.
   */
  public static async addBindingsToOperation(
    algebraFactory: AlgebraFactory,
    bindMethod: BindMethod,
    operation: Algebra.Operation,
    addBindings: { bindings: BindingsStream; metadata: MetadataBindings },
  ): Promise<Algebra.Operation> {
    // Blank nodes can not be passed in VALUES, and a blank node from an earlier result can not match in a query
    const bindings = (await addBindings.bindings.toArray())
      .filter(binding => ![ ...binding ].some(([ , value ]) => value.termType === 'BlankNode'));

    switch (bindMethod) {
      case 'values':
        return QuerySourceSparql.joinValues(algebraFactory, algebraFactory.createValues(
          addBindings.metadata.variables.map(v => v.variable),
          bindings.map(binding => Object.fromEntries([ ...binding ]
            .map(([ key, value ]) => [ key.value, <RDF.Literal | RDF.NamedNode> value ]))),
        ), operation);
      case 'union': { throw new Error('Not implemented yet: "union" case'); }
      case 'filter': { throw new Error('Not implemented yet: "filter" case'); }
    }
  }

  /**
   * Join values with an operation.
   * If the operation is a filter of which the expression uses none of the variables of the values,
   * the values are joined inside the filter, as that does not change the results.
   * This lets endpoints bind the values into the filtered operation, instead of evaluating it in full.
   * @param algebraFactory The algebra factory.
   * @param values The values.
   * @param operation The operation to join with.
   */
  public static joinValues(
    algebraFactory: AlgebraFactory,
    values: Algebra.Values,
    operation: Algebra.Operation,
  ): Algebra.Operation {
    if (operation.type === Algebra.Types.FILTER) {
      const expressionVariables = QuerySourceSparql.getVariableNames((<Algebra.Filter> operation).expression);
      if (!values.variables.some(variable => expressionVariables.has(variable.value))) {
        return algebraFactory.createFilter(
          QuerySourceSparql.joinValues(algebraFactory, values, (<Algebra.Filter> operation).input),
          (<Algebra.Filter> operation).expression,
        );
      }
    }
    return algebraFactory.createJoin([ values, operation ], false);
  }

  /**
   * Determine the names of all variables that occur in the given value, such as an expression,
   * including in the operations of EXISTS expressions.
   * @param value A value.
   */
  public static getVariableNames(value: object): Set<string> {
    const names = new Set<string>();
    const visited = new Set<object>();
    const visit = (child: any): void => {
      if (child && typeof child === 'object' && !visited.has(child)) {
        visited.add(child);
        if (child.termType === 'Variable') {
          names.add(child.value);
        }
        for (const [ key, grandChild ] of Object.entries(child)) {
          if (key !== 'metadata') {
            visit(grandChild);
          }
        }
      }
    };
    visit(value);
    return names;
  }

  /**
   * Convert an operation to a select query for this pattern.
   * @param algebraFactory The algebra factory.
   * @param {Algebra.Operation} operation A query operation.
   * @param {RDF.Variable[]} variables The variables in scope for the operation.
   * @return {string} A select query string.
   */
  public operationToSelectQuery(
    algebraFactory: AlgebraFactory,
    operation: Algebra.Operation,
    variables: RDF.Variable[],
  ): Promise<string> {
    return this.operationToQuery(algebraFactory.createProject(operation, variables));
  }

  /**
   * Convert an operation to a count query for the number of matching triples for this pattern.
   * @param dataFactory The data factory.
   * @param algebraFactory The algebra factory.
   * @param {Algebra.Operation} operation A query operation.
   * @return {string} A count query string.
   */
  public operationToCountQuery(
    dataFactory: ComunicaDataFactory,
    algebraFactory: AlgebraFactory,
    operation: Algebra.Operation,
  ): Promise<string> {
    return this.operationToQuery(algebraFactory.createProject(
      algebraFactory.createExtend(
        algebraFactory.createGroup(
          operation,
          [],
          [ algebraFactory.createBoundAggregate(
            dataFactory.variable('var0'),
            'count',
            algebraFactory.createWildcardExpression(),
            false,
          ) ],
        ),
        dataFactory.variable('count'),
        algebraFactory.createTermExpression(dataFactory.variable('var0')),
      ),
      [ dataFactory.variable('count') ],
    ));
  }

  /**
   * Convert an operation to a query for this pattern.
   * @param {Algebra.Operation} operation A query operation.
   * @return {string} A query string.
   */
  public async operationToQuery(operation: Algebra.Operation): Promise<string> {
    return (await this.mediatorQuerySerialize.mediate({
      queryFormat: { language: 'sparql', version: '1.2' },
      operation,
      newlines: false,
      indentWidth: 0,
      context: this.context,
    })).query;
  }

  /**
   * Obtain the SPARQL query string that may be sent as-is for the given operation.
   * @param operation A query operation.
   * @param context The action context.
   * @return The query string to send as-is, or undefined if the operation must be serialized.
   */
  public static getQueryStringAsIs(operation: Algebra.Operation, context: IActionContext): string | undefined {
    // TODO: next/major - remove the fallback to the original query string, see KeysInitQuery.queryString.
    return getOperationEquivalentQueryString(operation) ?? getOriginalSparqlQueryString(context);
  }

  /**
   * Check if the given operation may produce undefined values.
   * @param operation
   */
  public static getOperationUndefs(operation: Algebra.Operation): RDF.Variable[] {
    const variables: RDF.Variable[] = [];
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.LEFT_JOIN]: { preVisitor: (subOperation) => {
        const left = algebraUtils.inScopeVariables(subOperation.input[0]);
        const right = algebraUtils.inScopeVariables(subOperation.input[1]);
        for (const varRight of right) {
          if (!left.some(varLeft => varLeft.equals(varRight))) {
            variables.push(varRight);
          }
        }
        return { continue: false };
      } },
      [Algebra.Types.VALUES]: { preVisitor: (values) => {
        for (const variable of values.variables) {
          if (values.bindings.some(bindings => !(variable.value in bindings))) {
            variables.push(variable);
          }
        }
        return { continue: false };
      } },
      [Algebra.Types.UNION]: { preVisitor: (union) => {
        // Determine variables in scope of the union branches that are not occurring in every branch
        const scopedVariables = union.input.map(op => algebraUtils.inScopeVariables(op));
        for (const variable of uniqTerms(scopedVariables.flat())) {
          if (!scopedVariables.every(input => input.some(inputVar => inputVar.equals(variable)))) {
            variables.push(variable);
          }
        }
        return {};
      } },
    });
    return uniqTerms(variables);
  }

  /**
   * Send a SPARQL query to a SPARQL endpoint and retrieve its bindings as a stream.
   * @param {string} endpoint A SPARQL endpoint URL.
   * @param {string} query A SPARQL query string.
   * @param {RDF.Variable[]} variables The expected variables.
   * @param {IActionContext} context The source context.
   * @param undefVariables Variables that may have undefs.
   * @return {BindingsStream} A stream of bindings.
   */
  public async queryBindingsRemote(
    endpoint: string,
    query: string,
    variables: RDF.Variable[],
    context: IActionContext,
    undefVariables: RDF.Variable[],
  ): Promise<BindingsStream> {
    // Index undef variables
    const undefVariablesSet = new Set(undefVariables.map(v => v.value));

    // Abort the request if its results are not read until the end, e.g., when a LIMIT is reached.
    // Otherwise, the response is only paused, and the endpoint keeps evaluating the query until it times out.
    const abortController = new AbortController();
    const rawStream = await this.endpointFetcher.fetchBindings(
      endpoint,
      query,
      this.getRequestOptions(QuerySourceSparql.withAbortSignal(context, abortController.signal)),
    );
    let ended = false;
    rawStream.on('end', () => {
      ended = true;
    });
    rawStream.on('close', () => {
      if (!ended) {
        // The aborted response emits an error, which is forwarded to the results that nobody reads anymore
        rawStream.on('error', () => {
          // Ignore errors after aborting
        });
        abortController.abort();
      }
    });

    const wrapped = wrap<any>(rawStream, { autoStart: false, maxBufferSize: Number.POSITIVE_INFINITY });
    return wrapped.map<RDF.Bindings>((rawData: Record<string, RDF.Term>) => {
      const bindings = variables.map((variable) => {
        const value = rawData[`?${variable.value}`];
        if (!undefVariablesSet.has(variable.value) && !value) {
          Actor.getContextLogger(this.context)?.warn(`The endpoint ${endpoint} failed to provide a binding for ${variable.value}.`);
        }
        return <[RDF.Variable, RDF.Term]>[ variable, value ];
      }).filter(([ _, v ]) => Boolean(v));
      return this.bindingsFactory.bindings(bindings);
    });
  }

  /**
   * Add an abort signal to a context, in addition to its existing abort signal, if any.
   * @param context A context.
   * @param signal An abort signal.
   */
  public static withAbortSignal(context: IActionContext, signal: AbortSignal): IActionContext {
    const existingAbortSignal = context.get(KeysHttp.httpAbortSignal);
    return context.set(
      KeysHttp.httpAbortSignal,
      existingAbortSignal ? AbortSignal.any([ existingAbortSignal, signal ]) : signal,
    );
  }

  public toString(): string {
    return `QuerySourceSparql(${this.url})`;
  }
}

/**
 * Determines whether an endpoint is not sent COUNT queries, after one failed or took too long.
 */
export interface ICountFallback {
  /**
   * If the endpoint should not be sent COUNT queries over a pattern, or over other operations.
   * @param pattern If the COUNT query is over a single pattern.
   */
  isActive: (pattern: boolean) => boolean;
  /**
   * Stop sending COUNT queries over a pattern, or over other operations, to the endpoint for a while,
   * as one failed or took too long.
   * @param pattern If the COUNT query was over a single pattern.
   */
  activate: (pattern: boolean) => void;
}

interface IAskBatchEntry {
  operation: Algebra.Ask;
  context: IActionContext;
  resolve: (value: boolean) => void;
  reject: (error: unknown) => void;
}
