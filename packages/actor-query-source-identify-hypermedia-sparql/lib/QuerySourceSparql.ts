import type { MediatorHttp } from '@comunica/bus-http';
import type { MediatorQuerySerialize } from '@comunica/bus-query-serialize';
import { KeysInitQuery } from '@comunica/context-entries';
import { Actor } from '@comunica/core';
import type {
  Bindings,
  BindingsStream,
  ComunicaDataFactory,
  FragmentSelectorShape,
  IActionContext,
  IDataset,
  IQueryBindingsOptions,
  IQuerySource,
  MetadataBindings,
  MetadataVariable,
  QueryResultCardinality,
} from '@comunica/types';
import type { AlgebraFactory } from '@comunica/utils-algebra';
import { Algebra, algebraUtils, isKnownOperation } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { estimateCardinality } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { TransformIterator, wrap } from 'asynciterator';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { LRUCache } from 'lru-cache';
import { uniqTerms } from 'rdf-terms';
import type { BindMethod } from './ActorQuerySourceIdentifyHypermediaSparql';

export class QuerySourceSparql implements IQuerySource {
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

  private lastSourceContext: IActionContext | undefined;

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
    this.endpointFetcher = new SparqlEndpointFetcher({
      method: forceHttpGet ? 'GET' : 'POST',
      fetch: async(input: Request | string, init?: RequestInit) => {
        const response = await this.mediatorHttp.mediate(
          { input, init, context: this.lastSourceContext! },
        );
        // If we encounter a 404, try our backup URL.
        // After retrying the request with the new URL, we replace the URL for future requests.
        if (response.status === 404 && this.url !== this.urlBackup) {
          Actor.getContextLogger(this.context)?.warn(`Encountered a 404 when requesting ${this.url} according to the service description of ${this.urlBackup}. This is a server configuration issue. Retrying the current and modifying future requests to ${this.urlBackup} instead.`);
          input = (<string> input).replace(this.url, this.urlBackup);
          this.url = this.urlBackup;
          return await this.mediatorHttp.mediate(
            { input, init, context: this.lastSourceContext! },
          );
        }
        return response;
      },
      prefixVariableQuestionMark: true,
      dataFactory,
      forceGetIfUrlLengthBelow,
      directPost: metadata.postAccepted && !metadata.postAccepted.includes('application/x-www-form-urlencoded'),
      parseUnsupportedVersions,
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
  }

  public async getFilterFactor(): Promise<number> {
    return 1;
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

  public queryBindings(
    operationIn: Algebra.Operation,
    context: IActionContext,
    options?: IQueryBindingsOptions,
  ): BindingsStream {
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
      const queryString = context.get<string>(KeysInitQuery.queryString);
      const queryFormat: RDF.QueryFormat = context.getSafe(KeysInitQuery.queryFormat);
      const selectQuery: string = !options?.joinBindings && queryString && queryFormat.language === 'sparql' ?
        queryString :
        await this.operationToSelectQuery(this.algebraFactory, operation, variables);
      const undefVariables = QuerySourceSparql.getOperationUndefs(operation);

      return this.queryBindingsRemote(this.url, selectQuery, variables, context, undefVariables);
    }, { autoStart: false });
    this.attachMetadata(bindings, context, operationPromise);

    return bindings;
  }

  public queryQuads(operation: Algebra.Operation, context: IActionContext): AsyncIterator<RDF.Quad> {
    const quads = wrap<any>((async() => {
      this.lastSourceContext = this.context.merge(context);
      const query: string = context.get(KeysInitQuery.queryString) ?? await this.operationToQuery(operation);
      const rawStream = await this.endpointFetcher.fetchTriples(this.url, query);
      this.lastSourceContext = undefined;
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
    this.lastSourceContext = this.context.merge(context);
    const query: string = context.get(KeysInitQuery.queryString) ?? await this.operationToQuery(operation);
    const promise = this.endpointFetcher.fetchAsk(this.url, query);
    this.lastSourceContext = undefined;
    return promise;
  }

  public async queryVoid(operation: Algebra.Operation, context: IActionContext): Promise<void> {
    this.lastSourceContext = this.context.merge(context);
    const query: string = context.get(KeysInitQuery.queryString) ?? await this.operationToQuery(operation);
    const promise = this.endpointFetcher.fetchUpdate(this.url, query);
    this.lastSourceContext = undefined;
    return promise;
  }

  protected attachMetadata(
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

        // Don't send count queries if disabled.
        if (!this.cardinalityCountQueries) {
          return resolve({ type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: this.url });
        }

        const timeoutHandler = setTimeout(() => resolve({
          type: 'estimate',
          value: Number.POSITIVE_INFINITY,
          dataset: this.url,
        }), this.countTimeout);
        const varCount = this.dataFactory.variable('count');
        const bindingsStream: BindingsStream = await this
          .queryBindingsRemote(this.url, countQuery, [ varCount ], context, []);
        bindingsStream
          .on('data', (bindings: Bindings) => {
            clearTimeout(timeoutHandler);
            const count = bindings.get(varCount);
            const cardinality: QueryResultCardinality = {
              type: 'estimate',
              value: Number.POSITIVE_INFINITY,
              dataset: this.url,
            };
            if (count) {
              const cardinalityValue: number = Number.parseInt(count.value, 10);
              if (!Number.isNaN(cardinalityValue)) {
                cardinality.type = 'exact';
                cardinality.value = cardinalityValue;
                this.cache?.set(countQuery, cardinality);
              }
            }
            return resolve(cardinality);
          })
          .on('error', () => {
            clearTimeout(timeoutHandler);
            resolve({ type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: this.url });
          })
          .on('end', () => {
            clearTimeout(timeoutHandler);
            resolve({ type: 'estimate', value: Number.POSITIVE_INFINITY, dataset: this.url });
          });
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
    const bindings = await addBindings.bindings.toArray();

    switch (bindMethod) {
      case 'values':
        return algebraFactory.createJoin([
          algebraFactory.createValues(
            addBindings.metadata.variables.map(v => v.variable),
            bindings.map(binding => Object.fromEntries([ ...binding ]
              .map(([ key, value ]) => [ key.value, <RDF.Literal | RDF.NamedNode> value ]))),
          ),
          operation,
        ], false);
      case 'union': { throw new Error('Not implemented yet: "union" case'); }
      case 'filter': { throw new Error('Not implemented yet: "filter" case'); }
    }
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

    this.lastSourceContext = this.context.merge(context);
    const rawStream = await this.endpointFetcher.fetchBindings(endpoint, query);
    this.lastSourceContext = undefined;

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

  public toString(): string {
    return `QuerySourceSparql(${this.url})`;
  }
}
