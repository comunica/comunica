import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {IActionQueryOperation, IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {IActionSparqlParse, IActorSparqlParseOutput} from "@comunica/bus-sparql-parse";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {readFileSync} from "fs";
import minimist = require('minimist');
import {Algebra} from "sparqlalgebrajs";
import {Readable} from "stream";

/**
 * A comunica SPARQL Init Actor.
 */
export class ActorInitSparql extends ActorInit implements IActorInitSparqlArgs {

  public readonly mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  public readonly mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>,
    IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;
  public readonly query?: string;
  public readonly context?: string;

  constructor(args: IActorInitSparqlArgs) {
    super(args);
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  /**
   * Evaluate the given query
   * @param {string} query A query string.
   * @param context An optional query context.
   * @return {Promise<IActorQueryOperationOutput>} A promise that resolves to the query output.
   */
  public async evaluateQuery(query: string, context?: any): Promise<IActorQueryOperationOutput> {
    const operation: Algebra.Operation = (await this.mediatorSparqlParse.mediate({ query })).operation;
    const resolve: IActionQueryOperation = { context, operation };
    return await this.mediatorQueryOperation.mediate(resolve);
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const args = minimist(action.argv);
    if (!this.query && (!(args.q || args.f) && args._.length < (args.c ? 1 : 2) || args._.length < (args.c ? 0 : 1)
        || args.h || args.help)) {
      throw new Error(`comunica-sparql evaluates SPARQL queries

Usage:
  comunica-sparql http://fragments.example.org/dataset [-q] 'SELECT * WHERE { ?s ?p ?o }'
  comunica-sparql http://fragments.example.org/dataset [-f] query.sparql'

Options:
  -q      evaluate the given SPARQL query string
  -f      evaluate the SPARQL query in the given file
  -c      use the given JSON configuration file (e.g., config.json)
  --help  print this help message
      `);
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
        query = this.query;
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

    // Add entrypoint parameter to context
    if (args._.length > 0) {
      context.sources = context.sources || [];
      args._.forEach((sourceValue: string) => {
        const source: {[id: string]: string} = {};
        // TODO: improve this so that other source types can be selected, we currently assume TPF
        source.type = 'entrypoint';
        source.value = sourceValue;
        context.sources.push(source);
      });
      context.entrypoint = args._[0];
    }

    const result: IActorQueryOperationOutput = await this.evaluateQuery(query, context);

    result.bindingsStream.on('data', (binding) => readable.push(JSON.stringify(binding) + '\n'));
    result.bindingsStream.on('end', () => readable.push(null));
    const readable = new Readable();
    readable._read = () => {
      return;
    };

    return { stdout: readable };
  }

}

export interface IActorInitSparqlArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>,
    IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;
  query?: string;
  context?: string;
}
