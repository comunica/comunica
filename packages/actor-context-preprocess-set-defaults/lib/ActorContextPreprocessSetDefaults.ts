import type {
  IActorContextPreprocessOutput,
  IActorContextPreprocessArgs,
  IActionContextPreprocess,
} from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysCore, KeysInitQuery, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { IAction, IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { FunctionArgumentsCache, Logger } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
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
    this.logger = args.logger;
  }

  public async test(_action: IAction): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionContextPreprocess): Promise<IActorContextPreprocessOutput> {
    let context = action.context;

    if (action.initialize) {
      // Set default values
      context = context
        .setDefault(KeysInitQuery.queryTimestamp, new Date())
        .setDefault(KeysInitQuery.queryTimestampHighResolution, performance.now())
        .setDefault(KeysQuerySourceIdentify.sourceIds, new Map())
        .setDefault(KeysCore.log, this.logger)
        .setDefault(KeysInitQuery.functionArgumentsCache, this.defaultFunctionArgumentsCache)
        .setDefault(KeysInitQuery.dataFactory, new DataFactory());

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

      // If extensionFunctions is not set, default extensionFunctionsAlwaysPushdown to true.
      if (!context.has(KeysInitQuery.extensionFunctionsAlwaysPushdown) &&
        !context.has(KeysInitQuery.extensionFunctions)) {
        context = context.set(KeysInitQuery.extensionFunctionsAlwaysPushdown, true);
      }
    }

    return { context };
  }
}

export interface IActorContextPreprocessSetDefaultsArgs extends IActorContextPreprocessArgs {
  /**
   * The logger of this actor
   * @default {a <npmd:@comunica/logger-void/^5.0.0/components/LoggerVoid.jsonld#LoggerVoid>}
   */
  logger: Logger;
}
