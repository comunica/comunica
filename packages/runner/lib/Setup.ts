import {IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {Loader, LoaderProperties} from "componentsjs";
import {Runner} from "./Runner";

/**
 * Helper class to setup instances from a given comunica config file.
 * This config file must be understandable by the Components.js framework.
 *
 * @link https://www.npmjs.com/package/lsd-components
 */
export class Setup {

  private constructor() {
    throw new Error('The Setup class may not be constructed');
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
  public static async run(configResourceUrl: string, action: IActionInit, runnerUri?: string,
                          properties?: ISetupProperties): Promise<any> {
    if (!runnerUri) {
      runnerUri = 'urn:comunica:my';
    }

    const runner: Runner = await Setup.instantiateComponent(configResourceUrl, runnerUri, properties);
    await runner.initialize();
    let output: IActorOutputInit[];
    try {
      output = await runner.run(action);
    } catch (e) {
      await runner.deinitialize();
      throw e;
    }
    await runner.deinitialize();
    return output;
  }

  /**
   * Instantiate the given component.
   *
   * @param {string} configResourceUrl    The URL or local path to a Components.js config file.
   * @param {string} instanceUri          A URI identifying the component to instantiate.
   * @param {LoaderProperties} properties Properties to pass to the Components.js loader.
   * @return {Promise<any>}               A promise that resolves to the instance.
   */
  public static async instantiateComponent(configResourceUrl: string, instanceUri: string,
                                           properties?: ISetupProperties): Promise<any> {
    // Handle optional arguments
    if (!properties) {
      properties = {};
    }
    require('lodash.defaults')(properties, { mainModulePath: process.cwd() });

    // Instantiate the given config file
    const loader = new Loader(properties);
    await loader.registerAvailableModuleResources();
    return await loader.instantiateFromUrl(instanceUri, configResourceUrl);
  }

}

export type ISetupProperties = LoaderProperties;
