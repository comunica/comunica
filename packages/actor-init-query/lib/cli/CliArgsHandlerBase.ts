/* eslint-disable import/no-nodejs-modules */
import { exec } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import * as OS from 'os';
import { KeysHttp, KeysInitQuery, KeysQueryOperation, KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { LoggerPretty } from '@comunica/logger-pretty';
import type { IActionContext, ICliArgsHandler } from '@comunica/types';
import type { Argv } from 'yargs';

/**
 * Basic CLI arguments handler that handles common options.
 */
export class CliArgsHandlerBase implements ICliArgsHandler {
  private readonly initialContext?: IActionContext;

  public constructor(initialContext?: IActionContext) {
    this.initialContext = initialContext;
  }

  public static getScriptOutput(command: string, fallback: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          resolve(fallback);
        }
        resolve((stdout || stderr).trimEnd());
      });
    });
  }

  public static isDevelopmentEnvironment(): boolean {
    return existsSync(`${__dirname}/../../test`);
  }

  /**
   * Converts an URL like 'hypermedia@http://user:passwd@example.com to an IDataSource
   * @param {string} sourceString An url with possibly a type and authorization.
   * @return {[id: string]: any} An IDataSource which represents the sourceString.
   */
  public static getSourceObjectFromString(sourceString: string): Record<string, any> {
    const source: Record<string, any> = {};
    const mediaTypeRegex = /^([^:]*)@/u;
    const mediaTypeMatches = mediaTypeRegex.exec(sourceString);
    if (mediaTypeMatches) {
      source.type = mediaTypeMatches[1];
      sourceString = sourceString.slice((<number> source.type.length) + 1);
    }
    const authRegex = /\/\/(.*:.*)@/u;
    const authMatches = authRegex.exec(sourceString);
    if (authMatches) {
      const credentials = authMatches[1];
      source.context = new ActionContext({
        [KeysHttp.auth.name]: decodeURIComponent(credentials),
      });
      sourceString = sourceString.slice(0, authMatches.index + 2) +
        sourceString.slice(authMatches.index + credentials.length + 3);
    }
    source.value = sourceString;
    return source;
  }

  public populateYargs(argumentsBuilder: Argv<any>): Argv<any> {
    return argumentsBuilder
      .command(
        '$0 [sources...]',
        'evaluates SPARQL queries',
        () => {
          // Do nothing
        },
        () => {
          // Do nothing
        },
      )
      .default('sources', [])
      .hide('sources')
      .wrap(160)
      .version(false)
      .options({
        context: {
          alias: 'c',
          type: 'string',
          describe: 'Use the given JSON context string or file (e.g., config.json)',
        },
        to: {
          type: 'string',
          describe: 'Destination for update queries',
        },
        baseIRI: {
          alias: 'b',
          type: 'string',
          describe: 'base IRI for the query (e.g., http://example.org/)',
        },
        dateTime: {
          alias: 'd',
          type: 'string',
          describe: 'Sets a datetime for querying Memento-enabled archives',
        },
        logLevel: {
          alias: 'l',
          type: 'string',
          describe: 'Sets the log level (e.g., debug, info, warn, ...)',
          default: 'warn',
        },
        lenient: {
          type: 'boolean',
          describe: 'If failing requests and parsing errors should be logged instead of causing a hard crash',
        },
        version: {
          alias: 'v',
          type: 'boolean',
          describe: 'Prints version information',
        },
        showStackTrace: {
          type: 'boolean',
          describe: 'Prints the full stacktrace when errors are thrown',
        },
        httpTimeout: {
          type: 'number',
          describe: 'HTTP requests timeout in milliseconds',
        },
        httpBodyTimeout: {
          type: 'boolean',
          describe: 'Makes the HTTP timeout take into account the response body stream read',
        },
        httpRetryCount: {
          type: 'number',
          describe: 'The number of retries to perform on failed fetch requests',
        },
        httpRetryDelay: {
          type: 'number',
          describe: 'The number of milliseconds to wait between fetch retries',
        },
        httpRetryOnServerError: {
          type: 'boolean',
          describe: 'If fetch should be retried on 5xx server error responses, instead of being resolved.',
        },
        unionDefaultGraph: {
          type: 'boolean',
          describe: 'If the default graph should also contain the union of all named graphs',
        },
      })
      .exitProcess(false)
      .fail(false)
      .help(false);
  }

  public async handleArgs(args: Record<string, any>, context: Record<string, any>): Promise<void> {
    // Print version information
    if (args.version) {
      const comunicaVersion: string = require('../../package.json').version;
      const dev: string = CliArgsHandlerBase.isDevelopmentEnvironment() ? '(dev)' : '';
      const nodeVersion: string = process.version;
      const npmVersion: string = await CliArgsHandlerBase.getScriptOutput('npm -v', '_NPM is unavailable_');
      const yarnVersion: string = await CliArgsHandlerBase.getScriptOutput('yarn -v', '_Yarn is unavailable_');
      const os = `${OS.platform()} (${OS.type()} ${OS.release()})`;

      const message = `| software         | version
| ---------------- | -------
| Comunica Engine  | ${comunicaVersion} ${dev}
| node             | ${nodeVersion}
| npm              | ${npmVersion}
| yarn             | ${yarnVersion}
| Operating System | ${os}
`;

      return Promise.reject(new Error(message));
    }

    // Inherit default context options
    if (this.initialContext) {
      Object.assign(context, this.initialContext.toJS());
    }

    // Define context
    if (args.context) {
      Object.assign(context, JSON.parse(existsSync(args.context) ? readFileSync(args.c, 'utf8') : args.context));
    } else if (args.sources[0]?.startsWith('{')) {
      // For backwards compatibility inline JSON
      Object.assign(context, JSON.parse(args.sources[0]));
      args.sources.shift();
    }

    // Add sources to context
    if (args.sources.length > 0) {
      context.sources = context.sources || [];
      args.sources.forEach((sourceValue: string) => {
        const source = CliArgsHandlerBase.getSourceObjectFromString(sourceValue);
        context.sources.push(source);
      });
    }

    // Add destination to context
    if (args.to) {
      context[KeysRdfUpdateQuads.destination.name] = args.to;
    }

    // Set the logger
    if (!context.log) {
      context.log = new LoggerPretty({ level: args.logLevel });
    }

    // Define the base IRI
    if (args.baseIRI) {
      context[KeysInitQuery.baseIRI.name] = args.baseIRI;
    }

    // Define lenient-mode
    if (args.lenient) {
      context[KeysInitQuery.lenient.name] = true;
    }

    // Define HTTP timeout
    if (args.httpTimeout) {
      context[KeysHttp.httpTimeout.name] = args.httpTimeout;
    }

    // Define HTTP body timeout
    if (args.httpBodyTimeout) {
      if (!args.httpTimeout) {
        throw new Error('The --httpBodyTimeout option requires the --httpTimeout option to be set');
      }
      context[KeysHttp.httpBodyTimeout.name] = args.httpBodyTimeout;
    }

    // Define HTTP retry count
    if (args.httpRetryCount) {
      context[KeysHttp.httpRetryCount.name] = args.httpRetryCount;
    }

    // Define HTTP delay between retries
    if (args.httpRetryDelay) {
      if (!args.httpRetryCount) {
        throw new Error('The --httpRetryDelay option requires the --httpRetryCount option to be set');
      }
      context[KeysHttp.httpRetryDelay.name] = args.httpRetryDelay;
    }

    // Define HTTP retry on server error response
    if (args.httpRetryOnServerError) {
      if (!args.httpRetryCount) {
        throw new Error('The --httpRetryOnServerError option requires the --httpRetryCount option to be set');
      }
      context[KeysHttp.httpRetryOnServerError.name] = args.httpRetryOnServerError;
    }

    // Define union default graph
    if (args.unionDefaultGraph) {
      context[KeysQueryOperation.unionDefaultGraph.name] = true;
    }
  }
}
/* eslint-enable import/no-nodejs-modules */

