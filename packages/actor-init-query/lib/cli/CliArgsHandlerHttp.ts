import type { ICliArgsHandler } from '@comunica/types';
import type { Argv } from 'yargs';

/**
 * CLI arguments handler that handles options for HTTP servers.
 */
export class CliArgsHandlerHttp implements ICliArgsHandler {
  public populateYargs(argumentsBuilder: Argv<any>): Argv<any> {
    return argumentsBuilder
      .usage('$0 exposes a SPARQL endpoint')
      .example([
        [ `$0 https://fragments.dbpedia.org/2016-04/en`, '' ],
        [ `$0 https://fragments.dbpedia.org/2016-04/en https://query.wikidata.org/sparql`, '' ],
        [ `$0 hypermedia@https://fragments.dbpedia.org/2016-04/en sparql@https://query.wikidata.org/sparql`, '' ],
      ])
      .options({
        port: {
          alias: 'p',
          type: 'number',
          describe: 'HTTP port to run on',
          default: 3_000,
          group: 'Recommended options:',
        },
        workers: {
          alias: 'w',
          type: 'number',
          describe: 'Number of worker threads',
          default: 1,
          group: 'Recommended options:',
        },
        timeout: {
          alias: 't',
          type: 'number',
          describe: 'Query execution timeout in seconds',
          default: 60,
          group: 'Recommended options:',
        },
        update: {
          alias: 'u',
          type: 'boolean',
          describe: 'Enable update queries (otherwise, only read queries are enabled)',
          default: false,
          group: 'Recommended options:',
        },
        invalidateCache: {
          alias: 'i',
          type: 'boolean',
          describe: 'Enable cache invalidation before each query execution',
          default: false,
        },
        freshWorker: {
          type: 'boolean',
          describe: 'Kills the worker after each query execution',
          default: false,
        },
        contextOverride: {
          type: 'boolean',
          describe: 'If the query context can be overridden through POST requests',
          default: false,
        },
      })
      .check(args => {
        if (args.version) {
          return true;
        }
        if (args.context ? args.sources.length > 0 : args.sources.length === 0) {
          throw new Error('At least one source must be provided');
        }
        return true;
      });
  }

  public async handleArgs(args: Record<string, any>, context: Record<string, any>): Promise<void> {
    // Do nothing
  }
}
