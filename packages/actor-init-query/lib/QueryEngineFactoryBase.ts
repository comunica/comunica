import type { ISetupProperties, Runner } from '@comunica/runner';
import { instantiateComponent } from '@comunica/runner';
import type { ActorInitQueryBase } from './ActorInitQueryBase';
import type { QueryEngineBase } from './QueryEngineBase';

/**
 * A factory that can create query engines dynamically based on a given config.
 */
export class QueryEngineFactoryBase<Q extends QueryEngineBase> {
  /**
   * @param moduleRootPath The path to the invoking module.
   * @param defaultConfigPath The path to the config file.
   * @param queryEngineWrapper Callback for wrapping a query init actor in a query engine.
   */
  public constructor(
    private readonly moduleRootPath: string,
    private readonly defaultConfigPath: string,
    private readonly queryEngineWrapper: (actorInitQuery: ActorInitQueryBase) => Q,
  ) {}

  /**
   * Create a new Comunica query engine.
   * @param options Optional settings on how to instantiate the query engine.
   */
  public async create(options: IDynamicQueryEngineOptions = {}): Promise<Q> {
    if (!options.mainModulePath) {
      // This makes sure that our configuration is found by Components.js
      options.mainModulePath = this.moduleRootPath;
    }
    const configResourceUrl: string = options.configPath ?? this.defaultConfigPath;
    const instanceUri: string = options.instanceUri ?? 'urn:comunica:default:init/actors#query';

    // Instantiate the main runner so that all other actors are instantiated as well,
    // and find the SPARQL init actor with the given name
    const runnerInstanceUri: string = options.runnerInstanceUri ?? 'urn:comunica:default:Runner';

    // This needs to happen before any promise gets generated
    const runner: Runner = await instantiateComponent(configResourceUrl, runnerInstanceUri, options);
    const actorInitQuery = <ActorInitQueryBase> runner.collectActors({ engine: instanceUri }).engine;
    return this.queryEngineWrapper(actorInitQuery);
  }
}

export interface IDynamicQueryEngineOptions extends ISetupProperties {
  /**
   * The path or URL to a Components.js config file.
   */
  configPath?: string;
  /**
   * A URI identifying the component to instantiate.
   */
  instanceUri?: string;
  /**
   * A URI identifying the runner component.
   */
  runnerInstanceUri?: string;
}
