import type { ICliArgsHandler } from '@comunica/types';
import type { Argv } from 'yargs';
import {
  type CacheLocation
} from "sparql-cache-client";

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires
const { interactiveLogin } = require('solid-node-interactive-auth');

/**
 * Adds and handles CLI options for remote cache.
 */
export class CliArgsHandlerRemoteCache implements ICliArgsHandler {
  public populateYargs(argumentsBuilder: Argv<any>): Argv<any> {
    return argumentsBuilder
      .options({
        location: {
          alias: 'loc',
          type: 'string',
          describe: 'Location of the remote cache',
          group: 'Required options:',
        },
        valueClauseBlockSize: {
          alias: 'vcbs',
          type: 'number',
          default: 20000,
          describe: 'The number of VALUES clauses to group together in a single query to the remote cache.',
          group: 'Advanced options:',
        },
        valueClauseReduction: {
          alias: 'vcr',
          type: 'boolean',
          default: true,
          describe: 'Whether to reduce the number of VALUES clauses sent to the remote cache by removing those that are already contained in the query.',
          group: 'Advanced options:',
        },
        failOnCacheMiss: {
          alias: 'focm',
          type: 'boolean',
          default: false,
          describe: 'Whether to return an error if a query cannot be found in the remote cache.',
          group: 'Advanced options:',
        },
        saveToCache: {
          alias: 'stc',
          type: 'boolean',
          default: false,
          describe: 'Whether to save query results to the remote cache.',
          group: 'Advanced options:',
        },
      });
  }

  public async handleArgs(args: Record<string, any>, context: Record<string, any>): Promise<void> {
    context['@comunica/remote-cache:location'] = args.location as CacheLocation;
    if (args.valueClauseBlockSize !== 'void') {
      context['@comunica/remote-cache:valueClauseBlockSize'] = args.valueClauseBlockSize as number;
    }
    if (args.valueClauseReduction !== 'void') {
      context['@comunica/remote-cache:valueClauseReduction'] = args.valueClauseReduction as boolean;
    }
    if (args.failOnCacheMiss !== 'void') {
      context['@comunica/remote-cache:failOnCacheMiss'] = args.failOnCacheMiss as boolean;
    }
    if (args.saveToCache !== 'void') {
      context['@comunica/remote-cache:saveToCache'] = args.saveToCache as boolean;
    }
  }
}