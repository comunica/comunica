import { exec } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { KEY_CONTEXT_DATETIME } from '@comunica/actor-http-memento';
import { KEY_CONTEXT_HTTPPROXYHANDLER, ProxyHandlerStatic } from '@comunica/actor-http-proxy';
import { IActionInit, IActorOutputInit } from '@comunica/bus-init';
import { IActorQueryOperationOutput, KEY_CONTEXT_BASEIRI } from '@comunica/bus-query-operation';
import { KEY_CONTEXT_SOURCES } from '@comunica/bus-rdf-resolve-quad-pattern';
import { LoggerPretty } from '@comunica/logger-pretty';
import minimist = require('minimist');
import * as OS from "os";
import * as fs from "fs";
import {Readable, Writable} from "stream";
import {
  ActorInitSparql as ActorInitSparqlBrowser,
  IActorInitSparqlArgs, KEY_CONTEXT_LENIENT, KEY_CONTEXT_QUERYFORMAT,
} from "./ActorInitSparql-browser";
import { stderr } from "process";


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
  public static readonly HELP_MESSAGE = require('streamify-string')(`comunica-sparql evaluates SPARQL queries

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
  `);

  constructor(args: IActorInitSparqlArgs) {
    super(args);
  }

  public static getScriptOutput(command: string, fallback: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          resolve(fallback);
        }
        resolve((stdout || stderr).trimRight());
      });
    });
  }

  public static isDevelopmentEnvironment(): boolean {
    return existsSync(__dirname + '/../test');
  }

  static async buildContext(args: minimist.ParsedArgs, queryOrHttp: number, helpMessage: string, queryString?: string) : Promise<any> {
    const query : boolean = queryOrHttp === 0;

    // Print version information
    if (args.v || args.version) {
      const comunicaVersion: string = require('../package.json').version;
      const dev: string = this.isDevelopmentEnvironment() ? '(dev)' : '';
      const nodeVersion: string = process.version;
      const npmVersion: string = await this.getScriptOutput('npm -v', '_NPM is unavailable_');
      const yarnVersion: string = await this.getScriptOutput('yarn -v', '_Yarn is unavailable_');
      const os: string = `${OS.platform()} (${OS.type()} ${OS.release()})`;

      const message = require('streamify-string')(`| software            | version
| ------------------- | -------
| Comunica Init Actor | ${comunicaVersion} ${dev}
| node                | ${nodeVersion}
| npm                 | ${npmVersion}
| yarn                | ${yarnVersion}
| Operating System    | ${os}
`);

      return { stderr: message };
    }

    if (args.h || args.help ||
        (query && (!args.listformats && (!queryString && (!(args.q || args.f) && args._.length < (args.c ? 1 : 2)
        || args._.length < (args.c ? 0 : 1))))) ||
        (!query && ((args.c && args._.length !== 0) || (!args.c && args._.length === 0)))) {

      // Print command usage
      return { stderr: helpMessage };
    }

    // Define context
    let context: any = {};
    if (args.c) {
      context = JSON.parse(fs.existsSync(args.c) ? fs.readFileSync(args.c, 'utf8') : args.c);
    } else if (!query && args._[0] && args._[0].charAt(0) === '{') { // for backwards compatibility http
      context = JSON.parse(args._[0]);
      args._.shift();
    }

    // Add sources to context
    if (args._.length > 0) {
      context.sources = context.sources || [];
      args._.forEach((sourceValue: string) => {
        const source: {[id: string]: string} = {};
        const splitValues: string[] = sourceValue.split('@', 2);
        if (splitValues.length > 1) {
          source.type = splitValues[0];
        }
        source.value = splitValues[splitValues.length - 1];
        context.sources.push(source);
      });
    }

    // Set the logger
    if (!context.log || args.l) {
      context.log = new LoggerPretty({ level: args.l || 'warn' });
    }

    // Define the base IRI
    if (args.b) {
      context[KEY_CONTEXT_BASEIRI] = args.b;
    }

    // Define lenient-mode
    if (args.lenient) {
      context[KEY_CONTEXT_LENIENT] = true;
    }

    return context;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const args = minimist(action.argv);

    const context: any = await ActorInitSparql.buildContext(args, 0, ActorInitSparql.HELP_MESSAGE, this.queryString);

    if (context.stderr) {
      return context;
    }

    // Print supported MIME types
    if (args.listformats) {
      const mediaTypes: {[id: string]: number} = await this.getResultMediaTypes();
      return { stdout: require('streamify-string')(Object.keys(mediaTypes).join('\n')) };
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
      query = args._.pop();
      if (!query) {
        // If we get here, this.queryString will always be defined
        query = <string> this.queryString;
      }
    }

    // Define the query format
    context[KEY_CONTEXT_QUERYFORMAT] = this.defaultQueryInputFormat;
    if (args.i) {
      context[KEY_CONTEXT_QUERYFORMAT] = args.i;
    }

    // Define the datetime
    if (args.d) {
      context[KEY_CONTEXT_DATETIME] = new Date(args.d);
    }

    // Set the proxy
    if (args.p) {
      context[KEY_CONTEXT_HTTPPROXYHANDLER] = new ProxyHandlerStatic(args.p);
    }

    // Evaluate query
    const queryResult: IActorQueryOperationOutput = await this.query(query, context);

    // Serialize output according to media type
    const stdout: Readable = <Readable> (await this.resultToString(queryResult, args.t, queryResult.context)).data;
    
    return { stdout };
  }
}
