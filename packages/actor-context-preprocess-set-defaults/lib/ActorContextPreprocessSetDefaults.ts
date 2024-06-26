import type {
  IActorContextPreprocessOutput,
  IActorContextPreprocessArgs,
  IActionContextPreprocess,
} from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysCore, KeysInitQuery, KeysQuerySourceIdentify, KeysStatisticsTracker } from '@comunica/context-entries';
import type { IAction, IActorTest } from '@comunica/core';
import type { FunctionArgumentsCache, Logger } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
// TODO MAKE THIS NICE
import type { ILoggerBunyanArgs, BunyanStreamProvider } from '@comunica/logger-bunyan';
import { LoggerBunyan, BunyanStreamProviderStdout, BunyanStreamProviderFile } from '@comunica/logger-bunyan';

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

  public async run(action: IActionContextPreprocess): Promise<IActorContextPreprocessOutput> {
    let context = action.context;

    if (action.initialize) {
      // Set default values
      context = context
        .setDefault(KeysInitQuery.queryTimestamp, new Date())
        .setDefault(KeysQuerySourceIdentify.sourceIds, new Map())
        .setDefault(KeysCore.log, this.logger)
        .setDefault(KeysInitQuery.functionArgumentsCache, this.defaultFunctionArgumentsCache)
        .setDefault(KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores, new Map())
        .setDefault(KeysStatisticsTracker.statistics, new Map());

      if (context.get(KeysStatisticsTracker.statisticsSaveLocation)){
        
        const streamProvider: BunyanStreamProvider = new BunyanStreamProviderFile(
          { path: `file:///${action.context.get(KeysStatisticsTracker.statisticsSaveLocation)!}` }
        );
        const loggerParams: ILoggerBunyanArgs = {
          name: 'comunica',
          level: 'trace',
          streamProviders: [ streamProvider ],
        };
        context = context.setDefault(KeysStatisticsTracker.statiticsLogger, new LoggerBunyan(loggerParams));
      }
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
