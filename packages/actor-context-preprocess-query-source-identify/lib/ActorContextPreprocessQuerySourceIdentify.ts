import type { IActorContextPreprocessOutput, IActorContextPreprocessArgs } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IAction, IActorTest } from '@comunica/core';
import type { IQuerySourceWrapper, QuerySourceUnidentified, QuerySourceUnidentifiedExpanded } from '@comunica/types';

/**
 * A comunica Query Source Identify Context Preprocess Actor.
 */
export class ActorContextPreprocessQuerySourceIdentify extends ActorContextPreprocess {
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
  public constructor(args: IActorContextPreprocessQuerySourceIdentifyArgs) {
    super(args);
  }

  public async test(action: IAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IAction): Promise<IActorContextPreprocessOutput> {
    let context = action.context;

    // Rewrite sources
    if (context.has(KeysInitQuery.querySourcesUnidentified)) {
      const querySourcesUnidentified: QuerySourceUnidentified[] = action.context
        .get(KeysInitQuery.querySourcesUnidentified)!;
      const querySourcesUnidentifiedExpanded = querySourcesUnidentified
        .map(querySource => this.expandSource(querySource));
      const querySources: IQuerySourceWrapper[] = await Promise.all(querySourcesUnidentifiedExpanded
        .map(async querySourceUnidentified => (await this.mediatorQuerySourceIdentify
          .mediate({ querySourceUnidentified, context: action.context })).querySource));
      context = action.context
        .delete(KeysInitQuery.querySourcesUnidentified)
        .set(KeysQueryOperation.querySources, querySources);
    }

    return { context };
  }

  public expandSource(querySource: QuerySourceUnidentified): QuerySourceUnidentifiedExpanded {
    if (typeof querySource === 'string' || 'match' in querySource) {
      return { value: querySource };
    }
    return querySource;
  }
}

export interface IActorContextPreprocessQuerySourceIdentifyArgs extends IActorContextPreprocessArgs {
  mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
}
