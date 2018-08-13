import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {ActorQueryOperation, Bindings, IActionQueryOperation,
  IActorQueryOperationOutput, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {
  DataSources,
  IDataSource,
  KEY_CONTEXT_SOURCE,
  KEY_CONTEXT_SOURCES,
} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {ActionContext} from "@comunica/core";
import {IMediatorTypeHttpRequests} from "@comunica/mediatortype-httprequests";
import {BufferedIterator, TransformIterator} from "asynciterator";
import {SparqlEndpointFetcher} from "fetch-sparql-endpoint";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {Algebra, Factory, toSparql, Util} from "sparqlalgebrajs";

/**
 * A comunica SPARQL Endpoint Query Operation Actor.
 */
export class ActorQueryOperationSparqlEndpoint extends ActorQueryOperation {

  protected static readonly FACTORY: Factory = new Factory();
  private static ALGEBRA_TYPES: string[] = Object.keys(Algebra.types).map((key) => (<any> Algebra.types)[key]);

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

  /**
   * Wrap a pattern in a select query.
   * @param {Operation} operation An operation.
   * @return {Project} A select query.
   */
  public static patternToSelectQuery(operation: Algebra.Operation): Algebra.Project {
    if (operation.type === 'project') {
      return <Algebra.Project> operation;
    }
    const variables: RDF.Variable[] = Util.inScopeVariables(operation);
    return ActorQueryOperationSparqlEndpoint.FACTORY.createProject(operation, variables);
  }

  /**
   * Get the single source if the context contains just a single source.
   * @param {ActionContext} context A context, can be null.
   * @return {Promise<IDataSource>} A promise resolving to the single datasource or null.
   */
  public static async getSingleSource(context: ActionContext): Promise<IDataSource> {
    if (context && context.has(KEY_CONTEXT_SOURCE)) {
      return context.get(KEY_CONTEXT_SOURCE);
    } else if (context && context.has(KEY_CONTEXT_SOURCES)) {
      const datasources: DataSources = context.get(KEY_CONTEXT_SOURCES);
      if (datasources.isEnded()) {
        const datasourcesArray: IDataSource[] = await require('arrayify-stream')(datasources.iterator());
        if (datasourcesArray.length === 1) {
          return datasourcesArray[0];
        }
      }
    }
    return null;
  }

  public async test(action: IActionQueryOperation): Promise<IMediatorTypeHttpRequests> {
    if (!action.operation) {
      throw new Error('Missing field \'operation\' in the query operation action: ' + require('util').inspect(action));
    }
    const source: IDataSource = await ActorQueryOperationSparqlEndpoint.getSingleSource(action.context);
    if (source && source.type === 'sparql') {
      return { httpRequests: 1 };
    }
    throw new Error(this.name + ' requires a single source with a \'sparql\' endpoint to be present in the context.');
  }

  public async run(action: IActionQueryOperation): Promise<IActorQueryOperationOutputBindings> {
    const endpoint: string = (await ActorQueryOperationSparqlEndpoint.getSingleSource(action.context)).value;
    const selectQuery: Algebra.Project = ActorQueryOperationSparqlEndpoint.patternToSelectQuery(action.operation);
    const query: string = toSparql(selectQuery);

    const bindingsStream: BufferedIterator<Bindings> = new BufferedIterator<Bindings>(
      { autoStart: false, maxBufferSize: Infinity });
    this.lastContext = action.context;
    this.endpointFetcher.fetchBindings(endpoint, query)
      .then((rawBindingsStream) => {
        let totalItems = 0;
        rawBindingsStream.on('error', (error) => bindingsStream.emit('error', error));
        rawBindingsStream.on('data', (rawBindings) => {
          totalItems++;
          bindingsStream._push(Bindings(rawBindings));
        });
        rawBindingsStream.on('end', () => {
          bindingsStream.emit('metadata', { totalItems });
          bindingsStream.close();
        });
      });

    const metadata = ActorQueryOperationSparqlEndpoint.cachifyMetadata(
      () => new Promise((resolve, reject) => {
        bindingsStream._fillBuffer();
        bindingsStream.on('error', reject);
        bindingsStream.on('end', () => reject(new Error('No metadata was found')));
        bindingsStream.on('metadata', resolve);
      }));

    return { type: 'bindings', metadata, bindingsStream, variables: selectQuery.variables.map(termToString) };
  }

}

export interface IActorQueryOperationSparqlEndpointArgs
  extends IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
}
