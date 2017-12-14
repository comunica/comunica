import {IActionInit, IActorOutputInit} from "@comunica/bus-init";
import Bluebird = require("bluebird");
import cancelableAwaiter = require("cancelable-awaiter");
import {Loader, LoaderProperties} from "componentsjs";
import tslib = require("tslib");
import {Runner} from "./Runner";

/**
 * Helper class to setup instances from a given comunica config file.
 * This config file must be understandable by the Components.js framework.
 *
 * @link https://www.npmjs.com/package/lsd-components
 */
export class Setup {

  private static preparedPromises: boolean = false;

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
   * @return {Promise<void>}              A promise that resolves when the runner has been initialized.
   */
  public static async run(configResourceUrl: string, action: IActionInit, runnerUri?: string,
                          properties?: LoaderProperties): Promise<any> {
    if (!Setup.preparedPromises) {
      Setup.preparedPromises = true;
      Setup.preparePromises();
    }

    // Handle optional arguments
    if (!runnerUri) {
      runnerUri = 'urn:comunica:my';
    }
    if (!properties) {
      properties = {};
    }
    require('lodash.defaults')(properties, { mainModulePath: process.cwd() });

    // Instantiate the given config file
    const loader = new Loader(properties);
    await loader.registerAvailableModuleResources();
    const runner: Runner = await loader.instantiateFromUrl(runnerUri, configResourceUrl);

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
   * Initialize the global Promise class.
   *
   * This will make sure that promises are cancellable,
   * by using Bluebird's promises.
   *
   * The TypeScript 'await' functionality will
   * is also enhanced so that these cancellable
   * promises can be used.
   *
   * @link https://www.npmjs.com/package/bluebird
   *
   * @private
   */
  private static preparePromises() {
    // Hack to use Bluebird's promise to enable promise cancellation.
    global.Promise = Bluebird;
    Bluebird.config({
      cancellation: true,
      longStackTraces: true,
      monitoring: true,
      warnings: true,
    });

    // Hack to allow 'await' to be used on Bluebird's cancellable promises.
    (tslib).__awaiter = cancelableAwaiter;
  }

}
