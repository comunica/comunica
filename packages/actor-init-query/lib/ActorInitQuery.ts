/* eslint-disable import/no-nodejs-modules */
import { readFileSync } from 'fs';
import type { IActionInit, IActorOutputInit } from '@comunica/bus-init';
import { KeysInitQuery } from '@comunica/context-entries';
import type { ICliArgsHandler, IQueryContextCommon } from '@comunica/types';
import type { Readable } from 'readable-stream';
import yargs from 'yargs';
import type { IActorInitQueryBaseArgs } from './ActorInitQueryBase';
import { ActorInitQueryBase } from './ActorInitQueryBase';
import { CliArgsHandlerBase } from './cli/CliArgsHandlerBase';
import { CliArgsHandlerQuery } from './cli/CliArgsHandlerQuery';
import { QueryEngineBase } from './QueryEngineBase';

const streamifyString = require('streamify-string');

/**
 * A comunica Query Init Actor.
 */
export class ActorInitQuery<QueryContext extends IQueryContextCommon = IQueryContextCommon>
  extends ActorInitQueryBase<QueryContext> {
  public constructor(args: IActorInitQueryBaseArgs<QueryContext>) {
    super(args);
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    // Wrap this actor in a query engine so we can conveniently execute queries
    const queryEngine = new QueryEngineBase<QueryContext>(this);

    const cliArgsHandlers: ICliArgsHandler[] = [
      new CliArgsHandlerBase(action.context),
      new CliArgsHandlerQuery(
        this.defaultQueryInputFormat,
        this.queryString,
        this.context,
      ),
      // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
      ...(<ICliArgsHandler[]> action.context?.get(KeysInitQuery.cliArgsHandlers)) || [],
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
      const mediaTypes: Record<string, number> = await queryEngine.getResultMediaTypes();
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
    const queryResult = await queryEngine.queryOrExplain(query!, <any> context);

    // Output query explanations in a different way
    if ('explain' in queryResult) {
      return {
        stdout: streamifyString(JSON.stringify(queryResult.data, null, '  ')),
      };
    }

    // Serialize output according to media type
    const stdout: Readable = <Readable> (await queryEngine.resultToString(
      queryResult,
      args.outputType,
      queryResult.context,
    )).data;

    return { stdout };
  }
}
/* eslint-enable import/no-nodejs-modules */
