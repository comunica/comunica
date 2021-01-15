import type { IActionInit, IActorOutputInit } from '@comunica/bus-init';
import { ComponentsManager } from 'componentsjs';
import type {
  IComponentsManagerBuilderOptions,
  IConstructionStrategy,
  ComponentRegistry,
  ConfigRegistry,
  IModuleState,
  LogLevel,
} from 'componentsjs';
import type { Runner } from './Runner';

/**
 * Helper functions to setup instances from a given comunica config file.
 * This config file must be understandable by the Components.js framework.
 *
 * @link https://www.npmjs.com/package/lsd-components
 */

/**
 * Instantiate the given component.
 *
 * @param {string} configResourceUrl    The URL or local path to a Components.js config file.
 * @param {string} instanceUri          A URI identifying the component to instantiate.
 * @param {ISetupProperties} properties Properties to pass to the Components.js manager.
 * @return {Promise<any>}               A promise that resolves to the instance.
 */
export async function instantiateComponent(configResourceUrl: string, instanceUri: string,
  properties?: ISetupProperties): Promise<any> {
  // Handle optional arguments
  if (!properties) {
    properties = {};
  }
  const propertiesActual: IComponentsManagerBuilderOptions<any> = { mainModulePath: process.cwd(), ...properties };

  // Instantiate the given config file
  const manager = await ComponentsManager.build(propertiesActual);
  await manager.configRegistry.register(configResourceUrl);
  return await manager.instantiate(instanceUri);
}

/**
 * Run the given config file.
 * This will initialize the runner, and deinitialize it once it has finished
 *
 * @param {string} configResourceUrl    The URL or local path to a Components.js config file.
 * @param {any[]} action                The action to pass to the runner.
 * @param {string} runnerUri            An optional URI identifying the runner.
 * @param {ISetupProperties} properties Properties to pass to the Components.js loader.
 * @return {Promise<any>}               A promise that resolves when the runner has been initialized.
 */
export async function run(configResourceUrl: string, action: IActionInit, runnerUri?: string,
  properties?: ISetupProperties): Promise<any> {
  if (!runnerUri) {
    runnerUri = 'urn:comunica:my';
  }

  const runner: Runner = await instantiateComponent(configResourceUrl, runnerUri, properties);
  await runner.initialize();
  let output: IActorOutputInit[];
  try {
    output = await runner.run(action);
  } catch (error: unknown) {
    await runner.deinitialize();
    throw error;
  }
  await runner.deinitialize();
  return output;
}

/**
 * A copy of {@link IComponentsManagerBuilderOptions}, with all fields optional.
 */
export interface ISetupProperties {
  /**
   * Absolute path to the package root from which module resolution should start.
   */
  mainModulePath?: string;

  /**
   * Callback for registering components and modules.
   * Defaults to an invocation of {@link ComponentRegistry.registerAvailableModules}.
   * @param registry A registry that accept component and module registrations.
   */
  moduleLoader?: (registry: ComponentRegistry) => Promise<void>;
  /**
   * Callback for registering configurations.
   * Defaults to no config registrations.
   * @param registry A registry that accepts configuration registrations.
   */
  configLoader?: (registry: ConfigRegistry) => Promise<void>;
  /**
   * A strategy for constructing instances.
   * Defaults to {@link ConstructionStrategyCommonJs}.
   */
  constructionStrategy?: IConstructionStrategy<any>;
  /**
   * If the error state should be dumped into `componentsjs-error-state.json`
   * after failed instantiations.
   * Defaults to `false`.
   */
  dumpErrorState?: boolean;
  /**
   * The logging level.
   * Defaults to `'warn'`.
   */
  logLevel?: LogLevel;
  /**
   * The module state.
   * Defaults to a newly created instances on the {@link mainModulePath}.
   */
  moduleState?: IModuleState;
}
