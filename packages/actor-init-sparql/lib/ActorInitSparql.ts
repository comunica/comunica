import { exec } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import * as OS from 'os';
import type { Readable } from 'stream';
import { ProxyHandlerStatic } from '@comunica/actor-http-proxy';
import type { IActionInit, IActorOutputInit } from '@comunica/bus-init';
import { KeysHttp, KeysHttpMemento, KeysHttpProxy, KeysInitSparql } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { LoggerPretty } from '@comunica/logger-pretty';
import type { IActorQueryOperationOutput } from '@comunica/types';
import minimist = require('minimist');
import type { IActorInitSparqlArgs } from './ActorInitSparql-browser';
import { ActorInitSparql as ActorInitSparqlBrowser } from './ActorInitSparql-browser';

// eslint-disable-next-line no-duplicate-imports
export {
  KEY_CONTEXT_INITIALBINDINGS,
  KEY_CONTEXT_QUERYFORMAT,
  KEY_CONTEXT_LENIENT,
} from './ActorInitSparql-browser';

/**
 * A comunica SPARQL Init Actor.
 */
export class ActorInitSparql extends ActorInitSparqlBrowser {
  public static readonly HELP_MESSAGE = `comunica-sparql evaluates SPARQL queries

  Usage:
    comunica-sparql http://fragments.dbpedia.org/2016-04/en [-q] 'SELECT * WHERE { ?s ?p ?o }'
    comunica-sparql http://fragments.dbpedia.org/2016-04/en [-q] '{ hero { name friends { name } } }' -i graphql
    comunica-sparql http://fragments.dbpedia.org/2016-04/en [-f] query.sparql'
    comunica-sparql http://fragments.dbpedia.org/2016-04/en https://query.wikidata.org/sparql ...
    comunica-sparql hypermedia@http://fragments.dbpedia.org/2016-04/en sparql@https://query.wikidata.org/sparql ...

  Options:
    -q            evaluate the given SPARQL query string
    -f            evaluate the SPARQL query in the given file
    -c            use the given JSON configuration file (e.g., config.json)
    -t            the MIME type of the output (e.g., application/json)
    -i            the query input format (e.g., graphql, defaults to sparql)
    -b            base IRI for the query (e.g., http://example.org/)
    -l            sets the log level (e.g., debug, info, warn, ... defaults to warn)
    -d            sets a datetime for querying Memento-enabled archives
    -p            delegates all HTTP traffic through the given proxy (e.g. http://myproxy.org/?uri=)
    --lenient     if failing requests and parsing errors should be logged instead of causing a hard crash
    --help        print this help message
    --listformats prints the supported MIME types
    --version     prints version information
  `;

  public constructor(args: IActorInitSparqlArgs) {
    super(args);
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
    return existsSync(`${__dirname}/../test`);
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
      source.context = ActionContext({
        [KeysHttp.auth]: decodeURIComponent(credentials),
      });
      sourceString = sourceString.slice(0, authMatches.index + 2) +
        sourceString.slice(authMatches.index + credentials.length + 3);
    }
    source.value = sourceString;
    return source;
  }

  public static async buildContext(args: minimist.ParsedArgs, queryContext: boolean, helpMessage: string,
    queryString?: string): Promise<any> {
    // Print version information
    if (args.v || args.version) {
      const comunicaVersion: string = require('../package.json').version;
      const dev: string = this.isDevelopmentEnvironment() ? '(dev)' : '';
      const nodeVersion: string = process.version;
      const npmVersion: string = await this.getScriptOutput('npm -v', '_NPM is unavailable_');
      const yarnVersion: string = await this.getScriptOutput('yarn -v', '_Yarn is unavailable_');
      const os = `${OS.platform()} (${OS.type()} ${OS.release()})`;

      const message = `| software            | version
| ------------------- | -------
| Comunica Init Actor | ${comunicaVersion} ${dev}
| node                | ${nodeVersion}
| npm                 | ${npmVersion}
| yarn                | ${yarnVersion}
| Operating System    | ${os}
`;

      return Promise.reject(new Error(message));
    }

    if (args.h || args.help || (queryContext &&
        (!args.listformats && (!queryString && (!(args.q || args.f) && args._.length < (args.c ? 1 : 2) ||
        args._.length < (args.c ? 0 : 1))))) ||
        (!queryContext && ((args.c && args._.length > 0) || (!args.c && args._.length === 0)))) {
      // Print command usage
      return Promise.reject(new Error(helpMessage));
    }

    // Define context
    let context: any = {};
    if (args.c) {
      context = JSON.parse(existsSync(args.c) ? readFileSync(args.c, 'utf8') : args.c);
      // For backwards compatibility http
    } else if (!queryContext && args._[0] && args._[0].startsWith('{')) {
      context = JSON.parse(args._[0]);
      args._.shift();
    }

    // Remove query so it does not become a source
    if (queryContext && !args.q && !args.f) {
      args._.pop();
    }

    // Add sources to context
    if (args._.length > 0) {
      context.sources = context.sources || [];
      args._.forEach((sourceValue: string) => {
        const source = this.getSourceObjectFromString(sourceValue);
        context.sources.push(source);
      });
    }

    // Set the logger
    if (!context.log || args.l) {
      context.log = new LoggerPretty({ level: args.l || 'warn' });
    }

    // Define the base IRI
    if (args.b) {
      context[KeysInitSparql.baseIRI] = args.b;
    }

    // Define lenient-mode
    if (args.lenient) {
      context[KeysInitSparql.lenient] = true;
    }

    return context;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const args = minimist(action.argv);

    // Print supported MIME types
    if (args.listformats) {
      const mediaTypes: Record<string, number> = await this.getResultMediaTypes();
      return { stdout: require('streamify-string')(`${Object.keys(mediaTypes).join('\n')}\n`) };
    }

    // Define query
    let query: string | undefined;
    if (args.q) {
      if (typeof args.q !== 'string') {
        throw new Error('The query option must be a string');
      }
      query = args.q;
    } else if (args.f) {
      query = readFileSync(args.f, { encoding: 'utf8' });
    } else {
      if (args._.length > 0) {
        query = args._[args._.length - 1];
      }
      if (!query) {
        // If we get here, this.queryString will always be defined
        query = this.queryString!;
      }
    }

    let context: any;
    try {
      context = await ActorInitSparql.buildContext(args, true, ActorInitSparql.HELP_MESSAGE, this.queryString);
    } catch (error: unknown) {
      return { stderr: require('streamify-string')((<Error> error).message) };
    }

    // Define the query format
    context[KeysInitSparql.queryFormat] = this.defaultQueryInputFormat;
    if (args.i) {
      context[KeysInitSparql.queryFormat] = args.i;
    }

    // Define the datetime
    if (args.d) {
      context[KeysHttpMemento.datetime] = new Date(args.d);
    }

    // Set the proxy
    if (args.p) {
      context[KeysHttpProxy.httpProxyHandler] = new ProxyHandlerStatic(args.p);
    }

    // Evaluate query
    const queryResult: IActorQueryOperationOutput = await this.query(query, context);

    // Serialize output according to media type
    const stdout: Readable = <Readable> (await this.resultToString(queryResult, args.t, queryResult.context)).data;

    return { stdout };
  }
}
