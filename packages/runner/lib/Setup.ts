import type { IActionInit, IActorOutputInit } from '@comunica/bus-init';
import type { LoaderProperties } from 'componentsjs';
import { Loader } from 'componentsjs';
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
 * @param {LoaderProperties} properties Properties to pass to the Components.js loader.
 * @return {Promise<any>}               A promise that resolves to the instance.
 */
export async function instantiateComponent(configResourceUrl: string, instanceUri: string,
  properties?: ISetupProperties): Promise<any> {
  // Handle optional arguments
  if (!properties) {
    properties = {};
  }
  properties = { mainModulePath: process.cwd(), ...properties };

  // Instantiate the given config file
  const loader = new Loader(properties);
  await loader.registerAvailableModuleResources();
  return await loader.instantiateFromUrl(instanceUri, configResourceUrl);
}

/**
 * Run the given config file.
 * This will initialize the runner, and deinitialize it once it has finished
 *
 * @param {string} configResourceUrl    The URL or local path to a Components.js config file.
 * @param {any[]} action                The action to pass to the runner.
 * @param {string} runnerUri            An optional URI identifying the runner.
 * @param {LoaderProperties} properties Properties to pass to the Components.js loader.
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

export type ISetupProperties = LoaderProperties;
