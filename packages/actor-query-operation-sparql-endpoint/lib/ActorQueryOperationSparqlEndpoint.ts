import type { EventEmitter } from 'events';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorHttp } from '@comunica/bus-http';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { getContextSourceFirst, getDataSourceType, getDataSourceValue } from '@comunica/bus-rdf-resolve-quad-pattern';
import {
  getContextDestinationFirst,
  getDataDestinationType,
  getDataDestinationValue,
} from '@comunica/bus-rdf-update-quads';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorArgs, IActorTest } from '@comunica/core';
import type { IMediatorTypeHttpRequests } from '@comunica/mediatortype-httprequests';
import type { IQueryableResult,
  IQueryableResultBindings,
  IQueryableResultBoolean,
  IQueryableResultQuads,
  IMetadata,
  IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { wrap } from 'asynciterator';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import type { IUpdateTypes } from 'fetch-sparql-endpoint';
import { termToString } from 'rdf-string';
import { Factory, toSparql, Util } from 'sparqlalgebrajs';

const BF = new BindingsFactory();

/**
 * A comunica SPARQL Endpoint Query Operation Actor.
 */
export class ActorQueryOperationSparqlEndpoint extends ActorQueryOperation {
  protected static readonly FACTORY: Factory = new Factory();

  public readonly mediatorHttp: MediatorHttp;

  public readonly checkUrlSuffixSparql: boolean;
  public readonly checkUrlSuffixUpdate: boolean;

  public readonly endpointFetcher: SparqlEndpointFetcher;

  protected lastContext: IActionContext;

  public constructor(args: IActorQueryOperationSparqlEndpointArgs) {
    super(args);
    this.endpointFetcher = new SparqlEndpointFetcher({
      method: args.forceHttpGet ? 'GET' : 'POST',
      fetch: (input: Request | string, init?: RequestInit) => this.mediatorHttp.mediate(
        { input, init, context: this.lastContext },
      ),
      prefixVariableQuestionMark: true,
    });
  }

  public async test(action: IActionQueryOperation): Promise<IMediatorTypeHttpRequests> {
    if (!action.operation) {
      throw new Error('Missing field \'operation\' in a query operation action.');
    }
    const source = getContextSourceFirst(action.context);
    const destination = getContextDestinationFirst(action.context);
    const sourceType = source ? getDataSourceType(source) : undefined;
    const destinationType = destination ? getDataDestinationType(destination) : undefined;
    const sourceValue = source ? getDataSourceValue(source) : undefined;
    const destinationValue = destination ? getDataDestinationValue(destination) : undefined;
    if ((source && sourceType === 'sparql' &&
      (!destination || (destinationType === 'sparql' && destinationValue === sourceValue))) ||
      (source && !sourceType && (!destination || (!destinationType && destinationValue === sourceValue)) &&
        typeof sourceValue === 'string' && (
        (this.checkUrlSuffixSparql && sourceValue.endsWith('/sparql')) ||
        (this.checkUrlSuffixUpdate && sourceValue.endsWith('/update'))
      ))) {
      return { httpRequests: 1 };
    }
    throw new Error(`${this.name} requires a single source with a 'sparql' endpoint to be present in the context or URL ending on /sparql or /update.`);
  }

  public async run(action: IActionQueryOperation): Promise<IQueryableResult> {
    const source = getContextSourceFirst(action.context);
    if (!source) {
      throw new Error('Illegal state: undefined sparql endpoint source.');
    }
    const endpoint: string = <string> getDataSourceValue(source);
    this.lastContext = action.context;

    // Determine the full SPARQL query that needs to be sent to the endpoint
    // Also check the type of the query (SELECT, CONSTRUCT (includes DESCRIBE) or ASK)
    let query: string;
    let type: 'SELECT' | 'CONSTRUCT' | 'ASK' | 'UNKNOWN' | IUpdateTypes | undefined;
    let variables: RDF.Variable[] | undefined;
    try {
      // Use the original query string if available
      query = action.context.get(KeysInitQuery.queryString) ?? toSparql(action.operation);
      // This will throw an error in case the result is an invalid SPARQL query
      type = this.endpointFetcher.getQueryType(query);

      // Also check if this is an update query
      if (type === 'UNKNOWN') {
        type = this.endpointFetcher.getUpdateTypes(query);
      }
    } catch {
      // Ignore errors
    }
    // If the input is an sub-query, wrap this in a SELECT
    if (!type || type === 'UNKNOWN') {
      variables = Util.inScopeVariables(action.operation);
      query = toSparql(ActorQueryOperationSparqlEndpoint.FACTORY.createProject(action.operation, variables));
      type = 'SELECT';
    }

    // Execute the query against the endpoint depending on the type
    switch (type) {
      case 'SELECT':
        if (!variables) {
          variables = Util.inScopeVariables(action.operation);
        }
        return this.executeQuery(endpoint, query!, false, variables);
      case 'CONSTRUCT':
        return this.executeQuery(endpoint, query!, true);
      case 'ASK':
        return <IQueryableResultBoolean>{
          type: 'boolean',
          booleanResult: this.endpointFetcher.fetchAsk(endpoint, query!),
        };
      default:
        return {
          type: 'update',
          updateResult: this.endpointFetcher.fetchUpdate(endpoint, query!),
        };
    }
  }

  /**
   * Execute the given SELECT or CONSTRUCT query against the given endpoint.
   * @param endpoint A SPARQL endpoint URL.
   * @param query A SELECT or CONSTRUCT query.
   * @param quads If the query returns quads, i.e., if it is a CONSTRUCT query.
   * @param variables Variables for SELECT queries.
   */
  public executeQuery(endpoint: string, query: string, quads: boolean, variables?: RDF.Variable[]):
  IQueryableResult {
    const inputStream: Promise<EventEmitter> = quads ?
      this.endpointFetcher.fetchTriples(endpoint, query) :
      this.endpointFetcher.fetchBindings(endpoint, query);
    let cardinality = 0;
    const stream = wrap<any>(inputStream, { autoStart: false, maxBufferSize: Number.POSITIVE_INFINITY })
      .map(rawData => {
        cardinality++;
        return quads ? rawData : BF.bindings(rawData);
      });
    inputStream.then(
      subStream => subStream.on('end', () => stream.emit('metadata', {
        cardinality,
        canContainUndefs: true,
      })),
      () => {
        // Do nothing
      },
    );

    const metadata: () => Promise<IMetadata> = ActorQueryOperationSparqlEndpoint.cachifyMetadata(
      () => new Promise((resolve, reject) => {
        (<any> stream)._fillBuffer();
        stream.on('error', reject);
        stream.on('end', () => reject(new Error('No metadata was found')));
        stream.on('metadata', resolve);
      }),
    );

    if (quads) {
      return <IQueryableResultQuads> {
        type: 'quads',
        quadStream: stream,
        metadata,
      };
    }
    return <IQueryableResultBindings> {
      type: 'bindings',
      bindingsStream: stream,
      metadata,
      variables: variables!.map(x => termToString(x)),
    };
  }
}

export interface IActorQueryOperationSparqlEndpointArgs
  extends IActorArgs<IActionQueryOperation, IActorTest, IQueryableResult> {
  /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
  /**
   * If URLs ending with '/sparql' should also be considered SPARQL endpoints.
   * @default {true}
   */
  checkUrlSuffixSparql: boolean;
  /**
   * If URLs ending with '/update' should also be considered SPARQL endpoints.
   * @default {true}
   */
  checkUrlSuffixUpdate: boolean;
  /**
   * If queries should be sent via HTTP GET instead of POST.
   * @default {false}
   */
  forceHttpGet: boolean;
}
