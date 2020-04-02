import {ISetupProperties, Runner, Setup} from "@comunica/runner";
import {ActorInitSparql} from "./ActorInitSparql";

/**
 * Create a new dynamic comunica engine.
 * @param {IQueryOptions} options Optional options on how to instantiate the query evaluator.
 * @param {string} moduleRootPath The path to the invoking module.
 * @param {string} defaultConfigPath The path to the config file.
 * @return {Promise<ActorInitSparql>} A promise that resolves to a fully wired comunica engine.
 */
export function newEngineDynamicArged(options: IQueryOptions, moduleRootPath: string,
                                      defaultConfigPath: string): Promise<ActorInitSparql> {
  if (!options.mainModulePath) {
    // This makes sure that our configuration is found by Components.js
    options.mainModulePath = moduleRootPath;
  }
  const configResourceUrl: string = options.configResourceUrl || defaultConfigPath;
  const instanceUri: string = options.instanceUri || 'urn:comunica:sparqlinit';

  // Instantiate the main runner so that all other actors are instantiated as well,
  // and find the SPARQL init actor with the given name
  const runnerInstanceUri: string = options.runnerInstanceUri || 'urn:comunica:my';

  // this needs to happen before any promise gets generated
  return Setup.instantiateComponent(configResourceUrl, runnerInstanceUri, options)
    .then((runner: Runner) => <ActorInitSparql> runner.collectActors({ engine: instanceUri }).engine);
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
