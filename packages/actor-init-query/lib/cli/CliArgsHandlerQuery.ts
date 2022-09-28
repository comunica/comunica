import { ProxyHandlerStatic } from '@comunica/actor-http-proxy';
import {
  KeysHttpMemento,
  KeysHttpProxy,
  KeysHttpWayback,
  KeysInitQuery,
  KeysQueryOperation,
} from '@comunica/context-entries';
import type { ICliArgsHandler } from '@comunica/types';
import type { Argv } from 'yargs';

/**
 * CLI arguments handler that handles options for query execution.
 */
export class CliArgsHandlerQuery implements ICliArgsHandler {
  private readonly defaultQueryInputFormat: string | undefined;
  private readonly queryString: string | undefined;
  private readonly context: string | undefined;

  public constructor(
    defaultQueryInputFormat: string | undefined,
    queryString: string | undefined,
    context: string | undefined,
  ) {
    this.defaultQueryInputFormat = defaultQueryInputFormat;
    this.queryString = queryString;
    this.context = context;
  }

  public populateYargs(argumentsBuilder: Argv<any>): Argv<any> {
    return argumentsBuilder
      .usage('$0 evaluates SPARQL queries')
      .example([
        [ `$0 https://fragments.dbpedia.org/2016-04/en -q 'SELECT * { ?s ?p ?o }'`, '' ],
        [ `$0 https://fragments.dbpedia.org/2016-04/en -f query.sparql`, '' ],
        [ `$0 https://fragments.dbpedia.org/2016-04/en https://query.wikidata.org/sparql ...`, '' ],
        [ `$0 hypermedia@https://fragments.dbpedia.org/2016-04/en sparql@https://query.wikidata.org/sparql ...`, '' ],
      ])
      .options({
        query: {
          alias: 'q',
          type: 'string',
          describe: 'Evaluate the given SPARQL query string',
          default: this.queryString,
          group: 'Recommended options:',
        },
        file: {
          alias: 'f',
          type: 'string',
          describe: 'Evaluate the SPARQL query in the given file',
          group: 'Recommended options:',
        },
        inputType: {
          alias: 'i',
          type: 'string',
          describe: 'Query input format (e.g., graphql, sparql)',
          default: this.defaultQueryInputFormat,
          group: 'Recommended options:',
        },
        outputType: {
          alias: 't',
          type: 'string',
          describe: 'MIME type of the output (e.g., application/json)',
          group: 'Recommended options:',
        },
        proxy: {
          alias: 'p',
          type: 'string',
          describe: 'Delegates all HTTP traffic through the given proxy (e.g. http://myproxy.org/?uri=)',
        },
        listformats: {
          type: 'boolean',
          describe: 'Prints the supported MIME types',
        },
        context: {
          type: 'string',
          describe: 'Use the given JSON context string or file (e.g., config.json)',
          default: this.context,
        },
        explain: {
          type: 'string',
          describe: 'Print the query plan',
          choices: [
            'parsed',
            'logical',
            'physical',
          ],
        },
        localizeBlankNodes: {
          type: 'boolean',
          describe: 'If blank nodes should be localized per bindings entry',
        },
        recoverBrokenLinks: {
          alias: 'r',
          type: 'boolean',
          describe: 'Use the WayBack machine to recover broken links',
          default: false,
        },
      })
      .check(args => {
        if (args.version || args.listformats) {
          return true;
        }
        if (!this.queryString ?
          !(args.query || args.file) && args.sources.length < (args.context ? 1 : 2) :
          args.sources.length < (args.context ? 0 : 1)) {
          throw new Error('At least one source and query must be provided');
        }
        return true;
      });
  }

  public async handleArgs(args: Record<string, any>, context: Record<string, any>): Promise<void> {
    // Define the query format
    context[KeysInitQuery.queryFormat.name] = { language: args.inputType, version: '1.1' };

    // Define the datetime
    if (args.dateTime) {
      context[KeysHttpMemento.datetime.name] = new Date(args.dateTime);
    }

    // Set the proxy
    if (args.proxy) {
      context[KeysHttpProxy.httpProxyHandler.name] = new ProxyHandlerStatic(args.proxy);
    }

    // Mark explain output
    if (args.explain) {
      context[KeysInitQuery.explain.name] = args.explain;
    }

    // Set the blank node localization
    if (args.localizeBlankNodes) {
      context[KeysQueryOperation.localizeBlankNodes.name] = args.localizeBlankNodes;
    }

    // Set recover broken links flag
    if (args.recoverBrokenLinks) {
      context[KeysHttpWayback.recoverBrokenLinks.name] = args.recoverBrokenLinks;
    }
  }
}
