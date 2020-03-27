import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {
  ActorQueryOperation,
  Bindings,
  IActionQueryOperation,
  IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings, IActorQueryOperationOutputBoolean, IActorQueryOperationOutputQuads,
} from "@comunica/bus-query-operation";
import {getDataSourceType, getDataSourceValue, IDataSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {IMediatorTypeHttpRequests} from "@comunica/mediatortype-httprequests";
import {DataSourceUtils} from "@comunica/utils-datasource";
import {BufferedIterator} from "asynciterator";
import {SparqlEndpointFetcher} from "fetch-sparql-endpoint";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {Factory, toSparql, Util} from "sparqlalgebrajs";
import EventEmitter = NodeJS.EventEmitter;

/**
 * A comunica SPARQL Endpoint Query Operation Actor.
 */
export class ActorQueryOperationSparqlEndpoint extends ActorQueryOperation {

  protected static readonly FACTORY: Factory = new Factory();

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  public readonly endpointFetcher: SparqlEndpointFetcher;

  protected lastContext: ActionContext;

  constructor(args: IActorQueryOperationSparqlEndpointArgs) {
    super(args);
    this.endpointFetcher = new SparqlEndpointFetcher({
      fetch: (input?: Request | string, init?: RequestInit) => this.mediatorHttp.mediate(
        { input, init, context: this.lastContext }),
      prefixVariableQuestionMark: true,
    });
  }

  public async test(action: IActionQueryOperation): Promise<IMediatorTypeHttpRequests> {
    if (!action.operation) {
      throw new Error('Missing field \'operation\' in a query operation action.');
    }
    const source: IDataSource = await DataSourceUtils.getSingleSource(action.context);
    if (source && getDataSourceType(source) === 'sparql') {
      return { httpRequests: 1 };
    }
    throw new Error(this.name + ' requires a single source with a \'sparql\' endpoint to be present in the context.');
  }

  public async run(action: IActionQueryOperation): Promise<IActorQueryOperationOutput> {
    const endpoint: string = getDataSourceValue(await DataSourceUtils.getSingleSource(action.context));
    this.lastContext = action.context;

    // Determine the full SPARQL query that needs to be sent to the endpoint
    // Also check the type of the query (SELECT, CONSTRUCT (includes DESCRIBE) or ASK)
    let query: string;
    let type: string;
    let variables: RDF.Variable[];
    try {
      query = toSparql(action.operation);
      // This will throw an error in case the result is an invalid SPARQL query
      type = this.endpointFetcher.getQueryType(query);
    } catch (e) {
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
      if (!variables)
        variables = Util.inScopeVariables(action.operation);
      return this.executeQuery(endpoint, query, false, variables);
    case 'CONSTRUCT':
      return this.executeQuery(endpoint, query, true);
    case 'ASK':
      return <IActorQueryOperationOutputBoolean>{
        type: 'boolean',
        booleanResult: this.endpointFetcher.fetchAsk(endpoint, query),
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
  public executeQuery(endpoint: string, query: string, quads: boolean, variables?: RDF.Variable[])
    : IActorQueryOperationOutput {
    const stream: BufferedIterator<any> = new BufferedIterator<any>(
      { autoStart: false, maxBufferSize: Infinity });
    const inputStream: Promise<EventEmitter> = quads
      ? this.endpointFetcher.fetchTriples(endpoint, query)
      : this.endpointFetcher.fetchBindings(endpoint, query);
    inputStream
      .then((rawStream) => {
        let totalItems = 0;
        rawStream.on('error', (error) => stream.emit('error', error));

        rawStream.on('data', (rawData) => {
          totalItems++;
          stream._push(quads ? rawData : Bindings(rawData));
        });

        rawStream.on('end', () => {
          stream.emit('metadata', { totalItems });
          stream.close();
        });
      })
      .catch((error) => stream.emit('error', error));

    const metadata: () => Promise<{[id: string]: any}> = ActorQueryOperationSparqlEndpoint.cachifyMetadata(
      () => new Promise((resolve, reject) => {
        stream._fillBuffer();
        stream.on('error', reject);
        stream.on('end', () => reject(new Error('No metadata was found')));
        stream.on('metadata', resolve);
      }));

    if (quads)
      return <IActorQueryOperationOutputQuads> {
        type: 'quads',
        quadStream: stream,
        metadata,
      };
    return <IActorQueryOperationOutputBindings> {
      type: 'bindings',
      bindingsStream: stream,
      metadata,
      variables: variables.map(termToString),
    };
  }

}

export interface IActorQueryOperationSparqlEndpointArgs
  extends IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
}
