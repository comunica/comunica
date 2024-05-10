import type { IActorContextPreprocessOutput, IActorContextPreprocessArgs } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysCore, KeysInitQuery, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { IAction, IActorTest } from '@comunica/core';
import type { FunctionArgumentsCache, Logger } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

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
