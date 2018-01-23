import {IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {ISetupProperties, Runner, Setup} from "@comunica/runner";
import {ActorInitSparql} from "./ActorInitSparql";

/**
 * A wired comunica engine.
 */
export class QueryEngine {

  private actor: ActorInitSparql;

  constructor(actor: ActorInitSparql) {
    this.actor = actor;
  }

  /**
   * Evaluate the given query.
   * @param {string} queryString A SPARQL query string.
   * @param context An optional query context.
   * @return {Promise<IActorQueryOperationOutput>}
   */
  public query(queryString: string, context?: any): Promise<IActorQueryOperationOutput> {
    return this.actor.evaluateQuery(queryString, context);
  }

}

/**
 * Create a new comunica engine.
 * @param {IQueryOptions} options Optional options on how to instantiate the query evaluator.
 * @return {Promise<QueryEngine>} A promise that resolves to a fully wired comunica engine.
 */
export function newEngine(options?: IQueryOptions): Promise<QueryEngine> {
  if (!options) {
    options = {};
  }
  if (!options.mainModulePath) {
    // This makes sure that our configuration is found by Components.js
    options.mainModulePath = '';
  }
  const configResourceUrl: string = options.configResourceUrl || __dirname + '/../config/config-default.json';
  const instanceUri: string = options.instanceUri || 'urn:comunica:sparqlinit';

  // Instantiate the main runner so that all other actors are instantiated as well,
  // and find the SPARQL init actor with the given name
  const runnerInstanceUri: string = options.runnerInstanceUri || 'urn:comunica:my';

  // this needs to happen before any promise gets generated
  Setup.preparePromises();
  return Setup.instantiateComponent(configResourceUrl, runnerInstanceUri, options)
    .then((runner: Runner) => {
      let actor: ActorInitSparql = null;
      for (const runningActor of runner.actors) {
        if (runningActor.name === instanceUri) {
          actor = <any> runningActor;
        }
      }
      if (!actor) {
        throw new Error('No SPARQL init actor was found with the name "' + instanceUri + '" in runner "'
          + runnerInstanceUri + '".');
      }
      return new QueryEngine(actor);
    });
}

/**
 * Options for configuring how the query evaluator must be instantiated.
 */
export interface IQueryOptions extends ISetupProperties {
  /**
   * The URL or local path to a Components.js config file.
   */
  configResourceUrl?: string;
  /**
   * A URI identifying the component to instantiate.
   */
  instanceUri?: string;
  /**
   * A URI identifying the runner component.
   */
  runnerInstanceUri?: string;
}
