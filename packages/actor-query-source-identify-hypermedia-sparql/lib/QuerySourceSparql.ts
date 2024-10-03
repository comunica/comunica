import type { MediatorHttp } from '@comunica/bus-http';
import { KeysInitQuery } from '@comunica/context-entries';
import { Actor } from '@comunica/core';
import type {
  Bindings,
  BindingsStream,
  ComunicaDataFactory,
  FragmentSelectorShape,
  IActionContext,
  IQueryBindingsOptions,
  IQuerySource,
  MetadataBindings,
  MetadataVariable,
} from '@comunica/types';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { TransformIterator, wrap } from 'asynciterator';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { LRUCache } from 'lru-cache';
import { uniqTerms } from 'rdf-terms';
import type { Factory, Algebra } from 'sparqlalgebrajs';
import { toSparql, Util } from 'sparqlalgebrajs';
import type { BindMethod } from './ActorQuerySourceIdentifyHypermediaSparql';

const COUNT_INFINITY: RDF.QueryResultCardinality = { type: 'estimate', value: Number.POSITIVE_INFINITY };

export class QuerySourceSparql implements IQuerySource {
  protected static readonly SELECTOR_SHAPE: FragmentSelectorShape = {
    type: 'disjunction',
    children: [
      {
        type: 'operation',
        operation: { operationType: 'wildcard' },
        joinBindings: true,
      },
    ],
  };

  public readonly referenceValue: string;
  private readonly url: string;
  private readonly context: IActionContext;
  private readonly mediatorHttp: MediatorHttp;
  private readonly bindMethod: BindMethod;
  private readonly countTimeout: number;
  private readonly dataFactory: ComunicaDataFactory;
  private readonly algebraFactory: Factory;
  private readonly bindingsFactory: BindingsFactory;

  private readonly endpointFetcher: SparqlEndpointFetcher;
  private readonly cache: LRUCache<string, RDF.QueryResultCardinality> | undefined;

  private lastSourceContext: IActionContext | undefined;

  public constructor(
    url: string,
    context: IActionContext,
    mediatorHttp: MediatorHttp,
    bindMethod: BindMethod,
    dataFactory: ComunicaDataFactory,
    algebraFactory: Factory,
    bindingsFactory: BindingsFactory,
    forceHttpGet: boolean,
    cacheSize: number,
    countTimeout: number,
  ) {
    this.referenceValue = url;
    this.url = url;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
    this.bindMethod = bindMethod;
    this.dataFactory = dataFactory;
    this.algebraFactory = algebraFactory;
    this.bindingsFactory = bindingsFactory;
    this.endpointFetcher = new SparqlEndpointFetcher({
      method: forceHttpGet ? 'GET' : 'POST',
      fetch: (input: Request | string, init?: RequestInit) => this.mediatorHttp.mediate(
        { input, init, context: this.lastSourceContext! },
      ),
      prefixVariableQuestionMark: true,
      dataFactory,
    });
    this.cache = cacheSize > 0 ?
      new LRUCache<string, RDF.QueryResultCardinality>({ max: cacheSize }) :
      undefined;
    this.countTimeout = countTimeout;
  }

  public async getSelectorShape(): Promise<FragmentSelectorShape> {
    return QuerySourceSparql.SELECTOR_SHAPE;
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
      const variables: RDF.Variable[] = Util.inScopeVariables(operation);
      const queryString = context.get<string>(KeysInitQuery.queryString);
      const selectQuery: string = !options?.joinBindings && queryString ?
        queryString :
        QuerySourceSparql.operationToSelectQuery(this.algebraFactory, operation, variables);
      const undefVariables = QuerySourceSparql.getOperationUndefs(operation);

      return this.queryBindingsRemote(this.url, selectQuery, variables, context, undefVariables);
    }, { autoStart: false });
    this.attachMetadata(bindings, context, operationPromise);

    return bindings;
  }

  public queryQuads(operation: Algebra.Operation, context: IActionContext): AsyncIterator<RDF.Quad> {
    this.lastSourceContext = this.context.merge(context);
    const rawStream = this.endpointFetcher.fetchTriples(
      this.url,
      context.get(KeysInitQuery.queryString) ?? QuerySourceSparql.operationToQuery(operation),
    );
    this.lastSourceContext = undefined;
    const quads = wrap<any>(rawStream, { autoStart: false, maxBufferSize: Number.POSITIVE_INFINITY });
    this.attachMetadata(quads, context, Promise.resolve(operation.input));
    return quads;
  }

  public queryBoolean(operation: Algebra.Ask, context: IActionContext): Promise<boolean> {
    this.lastSourceContext = this.context.merge(context);
    const promise = this.endpointFetcher.fetchAsk(
      this.url,
      context.get(KeysInitQuery.queryString) ?? QuerySourceSparql.operationToQuery(operation),
    );
    this.lastSourceContext = undefined;
    return promise;
  }

  public queryVoid(operation: Algebra.Update, context: IActionContext): Promise<void> {
    this.lastSourceContext = this.context.merge(context);
    const promise = this.endpointFetcher.fetchUpdate(
      this.url,
      context.get(KeysInitQuery.queryString) ?? QuerySourceSparql.operationToQuery(operation),
    );
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
    new Promise<RDF.QueryResultCardinality>(async(resolve, reject) => {
      // Prepare queries
      let countQuery: string;
      try {
        const operation = await operationPromise;
        const variablesScoped = Util.inScopeVariables(operation);
        countQuery = QuerySourceSparql.operationToCountQuery(this.dataFactory, this.algebraFactory, operation);
        const undefVariables = QuerySourceSparql.getOperationUndefs(operation);
        variablesCount = variablesScoped.map(variable => ({
          variable,
          canBeUndef: undefVariables.some(undefVariable => undefVariable.equals(variable)),
        }));

        const cachedCardinality = this.cache?.get(countQuery);
        if (cachedCardinality !== undefined) {
          return resolve(cachedCardinality);
        }

        const timeoutHandler = setTimeout(() => resolve(COUNT_INFINITY), this.countTimeout);
        const varCount = this.dataFactory.variable('count');
        const bindingsStream: BindingsStream = await this
          .queryBindingsRemote(this.url, countQuery, [ varCount ], context, []);
        bindingsStream.on('data', (bindings: Bindings) => {
          clearTimeout(timeoutHandler);
          const count = bindings.get(varCount);
          const cardinality: RDF.QueryResultCardinality = { type: 'estimate', value: Number.POSITIVE_INFINITY };
          if (count) {
            const cardinalityValue: number = Number.parseInt(count.value, 10);
            if (!Number.isNaN(cardinalityValue)) {
              cardinality.type = 'exact';
              cardinality.value = cardinalityValue;
              this.cache?.set(countQuery, cardinality);
            }
          }
          return resolve(cardinality);
        });
        bindingsStream.on('error', () => {
          clearTimeout(timeoutHandler);
          resolve(COUNT_INFINITY);
        });
        bindingsStream.on('end', () => {
          clearTimeout(timeoutHandler);
          resolve(COUNT_INFINITY);
        });
      } catch (error: unknown) {
        return reject(error);
      }
    })
      .then((cardinality) => {
        target.setProperty('metadata', {
          state: new MetadataValidationState(),
          cardinality,
          variables: variablesCount,
        });
      })
      .catch(() => target.setProperty('metadata', {
        state: new MetadataValidationState(),
        cardinality: COUNT_INFINITY,
        variables: variablesCount,
      }));
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
    algebraFactory: Factory,
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
              .map(([ key, value ]) => [ `?${key.value}`, <RDF.Literal | RDF.NamedNode> value ]))),
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
  public static operationToSelectQuery(
    algebraFactory: Factory,
    operation: Algebra.Operation,
    variables: RDF.Variable[],
  ): string {
    return QuerySourceSparql.operationToQuery(algebraFactory.createProject(operation, variables));
  }

  /**
   * Convert an operation to a count query for the number of matching triples for this pattern.
   * @param dataFactory The data factory.
   * @param algebraFactory The algebra factory.
   * @param {Algebra.Operation} operation A query operation.
   * @return {string} A count query string.
   */
  public static operationToCountQuery(
    dataFactory: ComunicaDataFactory,
    algebraFactory: Factory,
    operation: Algebra.Operation,
  ): string {
    return QuerySourceSparql.operationToQuery(algebraFactory.createProject(
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
  public static operationToQuery(operation: Algebra.Operation): string {
    return toSparql(operation, { sparqlStar: true });
  }

  /**
   * Check if the given operation may produce undefined values.
   * @param operation
   */
  public static getOperationUndefs(operation: Algebra.Operation): RDF.Variable[] {
    const variables: RDF.Variable[] = [];
    Util.recurseOperation(operation, {
      leftjoin(subOperation): boolean {
        const left = Util.inScopeVariables(subOperation.input[0]);
        const right = Util.inScopeVariables(subOperation.input[1]);
        for (const varRight of right) {
          if (!left.some(varLeft => varLeft.equals(varRight))) {
            variables.push(varRight);
          }
        }
        return false;
      },
      values(values: Algebra.Values): boolean {
        for (const variable of values.variables) {
          if (values.bindings.some(bindings => !(`?${variable.value}` in bindings))) {
            variables.push(variable);
          }
        }
        return false;
      },
      union(union: Algebra.Union): boolean {
        // Determine variables in scope of the union branches that are not occurring in every branch
        const scopedVariables = union.input.map(Util.inScopeVariables);
        for (const variable of uniqTerms(scopedVariables.flat())) {
          if (!scopedVariables.every(input => input.some(inputVar => inputVar.equals(variable)))) {
            variables.push(variable);
          }
        }

        return true;
      },
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
    const undefVariablesIndex: Set<string> = new Set();
    for (const undefVariable of undefVariables) {
      undefVariablesIndex.add(undefVariable.value);
    }

    this.lastSourceContext = this.context.merge(context);
    const rawStream = await this.endpointFetcher.fetchBindings(endpoint, query);
    this.lastSourceContext = undefined;

    return wrap<any>(rawStream, { autoStart: false, maxBufferSize: Number.POSITIVE_INFINITY })
      .map<RDF.Bindings>((rawData: Record<string, RDF.Term>) => this.bindingsFactory.bindings(variables
        .map((variable) => {
          const value = rawData[`?${variable.value}`];
          if (!undefVariablesIndex.has(variable.value) && !value) {
            Actor.getContextLogger(this.context)?.warn(`The endpoint ${endpoint} failed to provide a binding for ${variable.value}.`);
          }
          return <[RDF.Variable, RDF.Term]>[ variable, value ];
        })
        .filter(([ _, v ]) => Boolean(v))));
  }

  public toString(): string {
    return `QuerySourceSparql(${this.url})`;
  }
}
