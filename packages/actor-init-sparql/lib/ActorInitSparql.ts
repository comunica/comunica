import { readFileSync } from 'fs';
import type { Readable } from 'stream';
import type { IActionInit, IActorOutputInit } from '@comunica/bus-init';
import {
  KeysInitSparql,
} from '@comunica/context-entries';
import type { IActorQueryOperationOutput, IQueryExplained } from '@comunica/types';
import yargs from 'yargs';
import type { IActorInitSparqlBaseArgs } from './ActorInitSparqlBase';
import { ActorInitSparqlBase } from './ActorInitSparqlBase';
import { CliArgsHandlerBase } from './cli/CliArgsHandlerBase';
import { CliArgsHandlerQuery } from './cli/CliArgsHandlerQuery';
import type { ICliArgsHandler } from './cli/ICliArgsHandler';
const streamifyString = require('streamify-string');

// eslint-disable-next-line no-duplicate-imports
export {
  KEY_CONTEXT_INITIALBINDINGS,
  KEY_CONTEXT_QUERYFORMAT,
  KEY_CONTEXT_LENIENT,
} from './ActorInitSparqlBase';

/**
 * A comunica SPARQL Init Actor.
 */
export class ActorInitSparql extends ActorInitSparqlBase {
  public constructor(args: IActorInitSparqlBaseArgs) {
    super(args);
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const cliArgsHandlers: ICliArgsHandler[] = [
      new CliArgsHandlerBase(action.context),
      new CliArgsHandlerQuery(
        this.defaultQueryInputFormat,
        this.queryString,
        this.context,
      ),
      ...action.context?.get(KeysInitSparql.cliArgsHandlers) || [],
    ];

    // Populate yargs arguments object
    let argumentsBuilder = yargs({});
    for (const cliArgsHandler of cliArgsHandlers) {
      argumentsBuilder = cliArgsHandler.populateYargs(argumentsBuilder);
    }

    // Extract raw argument values from parsed yargs object, so that we can handle each of them hereafter
    let args: Record<string, any>;
    try {
      args = await argumentsBuilder.parse(action.argv);
    } catch (error: unknown) {
      return {
        stderr: require('streamify-string')(`${await argumentsBuilder.getHelp()}\n\n${(<Error> error).message}\n`),
      };
    }

    // Print supported MIME types
    if (args.listformats) {
      const mediaTypes: Record<string, number> = await this.getResultMediaTypes();
      return { stdout: require('streamify-string')(`${Object.keys(mediaTypes).join('\n')}\n`) };
    }

    // Define query
    // We need to do this before the cliArgsHandlers, as we may modify the sources array
    let query: string | undefined;
    if (args.query) {
      query = <string> args.query;
    } else if (args.file) {
      query = readFileSync(args.file, { encoding: 'utf8' });
    } else if (args.sources.length > 0) {
      query = args.sources[args.sources.length - 1];
      args.sources.pop();
    }

    // Invoke args handlers to process any remaining args
    const context: Record<string, any> = {};
    try {
      for (const cliArgsHandler of cliArgsHandlers) {
        await cliArgsHandler.handleArgs(args, context);
      }
    } catch (error: unknown) {
      return { stderr: require('streamify-string')((<Error> error).message) };
    }

    // Evaluate query
    const queryResult: IActorQueryOperationOutput | IQueryExplained = await this.queryOrExplain(query!, context);

    // Output query explanations in a different way
    if ('explain' in queryResult) {
      return {
        stdout: streamifyString(JSON.stringify(queryResult.data, null, '  ')),
      };
    }

    // Serialize output according to media type
    const stdout: Readable = <Readable> (await this.resultToString(
      queryResult,
      args.outputType,
      queryResult.context,
    )).data;

    return { stdout };
  }
}
