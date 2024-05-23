import type { IActorContextPreprocessOutput, IActorContextPreprocessArgs } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysCore, KeysInitQuery, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { IAction, IActorTest } from '@comunica/core';
import type {
  FunctionArgumentsCache,
  Logger,
  QuerySourceUnidentified,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { RdfStore } from 'rdf-stores';
import { DataFactory } from 'rdf-data-factory';

/**
 * A comunica Set Defaults Context Preprocess Actor.
 */
export class ActorContextPreprocessSetDefaults extends ActorContextPreprocess {
  private readonly defaultFunctionArgumentsCache: FunctionArgumentsCache;
  public readonly logger: Logger;

  public constructor(args: IActorContextPreprocessSetDefaultsArgs) {
    super(args);
    this.defaultFunctionArgumentsCache = {};
  }

  public async test(_action: IAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IAction): Promise<IActorContextPreprocessOutput> {
    let context = action.context;

    // Set default values
    context = context
      .setDefault(KeysInitQuery.queryTimestamp, new Date())
      .setDefault(KeysQuerySourceIdentify.sourceIds, new Map())
      .setDefault(KeysCore.log, this.logger)
      .setDefault(KeysInitQuery.functionArgumentsCache, this.defaultFunctionArgumentsCache)
      .setDefault(KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores, new Map());

    // Handle default query format
    let queryFormat: RDF.QueryFormat = { language: 'sparql', version: '1.1' };
    if (context.has(KeysInitQuery.queryFormat)) {
      queryFormat = context.get(KeysInitQuery.queryFormat)!;
      if (queryFormat.language === 'graphql') {
        context = context.setDefault(KeysInitQuery.graphqlSingularizeVariables, {});
      }
    } else {
      context = context.set(KeysInitQuery.queryFormat, queryFormat);
    }

    // Handle default data factory
    if (!context.has(KeysInitQuery.dataFactory)) {
      // Attempt to derive data factory from sources
      if (context.has(KeysInitQuery.querySourcesUnidentified)) {
        const querySourcesUnidentified: QuerySourceUnidentified[] = action.context
          .get(KeysInitQuery.querySourcesUnidentified)!;

        // Find all RDF/JS sources
        const sources: RDF.Source[] = [];
        for (const querySourceUnidentified of querySourcesUnidentified) {
          if (typeof querySourceUnidentified !== 'string' &&
            ('match' in querySourceUnidentified ||
              (querySourceUnidentified.value && typeof querySourceUnidentified.value !== 'string' &&
                'match' in querySourceUnidentified.value))) {
            sources.push(<RDF.Source>querySourceUnidentified);
          }
        }

        // If we find a single RDF/JS source (other types of sources may exist), then we use its dictionary.
        if (sources.length === 1) {
          const dataFactory: RDF.DataFactory | undefined = (<any>sources[0]).dataFactory;
          if (dataFactory) {
            context = context.setDefault(KeysInitQuery.dataFactory, dataFactory);
          }
        }
      }

      // Fallback to setting a default dictionary-encoded data factory
      context = context
        .setDefault(KeysInitQuery.dataFactory, RdfStore.createDefaultDataFactory());

      // context = context.set(KeysInitQuery.dataFactory, new DataFactory()); // TODO
    }

    return { context };
  }
}

export interface IActorContextPreprocessSetDefaultsArgs extends IActorContextPreprocessArgs {
  /**
   * The logger of this actor
   * @default {a <npmd:@comunica/logger-void/^3.0.0/components/LoggerVoid.jsonld#LoggerVoid>}
   */
  logger: Logger;
}
