import {KEY_CONTEXT_DATETIME} from "@comunica/actor-http-memento";
import {IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {KEY_CONTEXT_SOURCES} from "@comunica/bus-rdf-resolve-quad-pattern";
import {LoggerPretty} from "@comunica/logger-pretty";
import {exec} from "child_process";
import {existsSync, readFileSync} from "fs";
import minimist = require('minimist');
import * as OS from "os";
import {Readable} from "stream";
import {
  ActorInitSparql as ActorInitSparqlBrowser,
  IActorInitSparqlArgs,
  KEY_CONTEXT_QUERYFORMAT,
} from "./ActorInitSparql-browser";

/**
 * A comunica SPARQL Init Actor.
 */
export class ActorInitSparql extends ActorInitSparqlBrowser {

  constructor(args: IActorInitSparqlArgs) {
    super(args);
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const args = minimist(action.argv);
    if (!args.listformats && (!this.queryString && (!(args.q || args.f) && args._.length < (args.c ? 1 : 2)
        || args._.length < (args.c ? 0 : 1) || args.h || args.help || args.v || args.version))) {
      // Print version information
      if (args.v || args.version) {
        const comunicaVersion: string = require('../package.json').version;
        const dev: string = this.isDevelopmentEnvironment() ? '(dev)' : '';
        const nodeVersion: string = process.version;
        const npmVersion: string = await this.getScriptOutput('npm -v', '_NPM is unavailable_');
        const yarnVersion: string = await this.getScriptOutput('yarn -v', '_Yarn is unavailable_');
        const os: string = `${OS.platform()} (${OS.type()} ${OS.release()})`;
        return { stderr: require('streamify-string')(`| software            | version
| ------------------- | -------
| Comunica Init Actor | ${comunicaVersion} ${dev}
| node                | ${nodeVersion}
| npm                 | ${npmVersion}
| yarn                | ${yarnVersion}
| Operating System    | ${os}
`) };
      }

      // Print command usage
      return { stderr: require('streamify-string')(`comunica-sparql evaluates SPARQL queries

Usage:
  comunica-sparql http://fragments.example.org/dataset [-q] 'SELECT * WHERE { ?s ?p ?o }'
  comunica-sparql http://fragments.example.org/dataset [-q] '{ hero { name friends { name } } }' -i graphql
  comunica-sparql http://fragments.example.org/dataset [-f] query.sparql'
  comunica-sparql http://fragments.example.org/dataset http://sparql.example.org/ ...
  comunica-sparql hypermedia@http://fragments.example.org/dataset sparql@http://sparql.example.org/ ...

Options:
  -q            evaluate the given SPARQL query string
  -f            evaluate the SPARQL query in the given file
  -c            use the given JSON configuration file (e.g., config.json)
  -t            the MIME type of the output (e.g., application/json)
  -i            the query input format (e.g., graphql, defaults to sparql)
  -l            sets the log level (e.g., debug, info, warn, ... defaults to warn)
  -d            sets a datetime for querying Memento-enabled archives'
  --help        print this help message
  --listformats prints the supported MIME types
  --version     prints version information
`) };
    }

    // Print supported MIME types
    if (args.listformats) {
      const mediaTypes: {[id: string]: number} = await this.getResultMediaTypes(null);
      return { stdout: require('streamify-string')(Object.keys(mediaTypes).join('\n')) };
    }

    // Define query
    let query: string = null;
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
        query = this.queryString;
      }
    }

    // Define context
    let context: any = null;
    if (args.c) {
      context = JSON.parse(readFileSync(args.c, { encoding: 'utf8' }));
    } else if (this.context) {
      context = JSON.parse(this.context);
    } else {
      context = {};
    }

    // Define the query format
    context[KEY_CONTEXT_QUERYFORMAT] = this.defaultQueryInputFormat;
    if (args.i) {
      context[KEY_CONTEXT_QUERYFORMAT] = args.i;
    }

    // Set the logger
    context.log = new LoggerPretty({ level: args.l || 'warn' });

    // Define the datetime
    if (args.d) {
      context[KEY_CONTEXT_DATETIME] = new Date(args.d);
    }

    // Add sources to context
    if (args._.length > 0) {
      context[KEY_CONTEXT_SOURCES] = context[KEY_CONTEXT_SOURCES] || [];
      args._.forEach((sourceValue: string) => {
        const source: {[id: string]: string} = {};
        const splitValues: string[] = sourceValue.split('@', 2);
        if (splitValues.length === 1) {
          // Set default type
          source.type = 'auto';
        } else {
          source.type = splitValues[0];
        }
        source.value = splitValues[splitValues.length - 1];
        context[KEY_CONTEXT_SOURCES].push(source);
      });
    }

    // Evaluate query
    const queryResult: IActorQueryOperationOutput = await this.query(query, context);

    // Serialize output according to media type
    const stdout: Readable = <Readable> (await this.resultToString(queryResult, args.t, context)).data;

    return { stdout };
  }

  public getScriptOutput(command: string, fallback: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          resolve(fallback);
        }
        resolve((stdout || stderr).trimRight());
      });
    });
  }

  public isDevelopmentEnvironment(): boolean {
    return existsSync(__dirname + '/../test');
  }

}
