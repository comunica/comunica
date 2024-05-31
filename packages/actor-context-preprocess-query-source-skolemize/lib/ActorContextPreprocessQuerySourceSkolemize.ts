import type { IActorContextPreprocessOutput, IActorContextPreprocessArgs } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysQueryOperation, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { IActorTest, IAction } from '@comunica/core';
import type { IQuerySourceWrapper, QuerySourceReference } from '@comunica/types';
import { QuerySourceSkolemized } from './QuerySourceSkolemized';
import { getSourceId } from './utils';

/**
 * A comunica Query Source Skolemize Context Preprocess Actor.
 */
export class ActorContextPreprocessQuerySourceSkolemize extends ActorContextPreprocess {
  public constructor(args: IActorContextPreprocessArgs) {
    super(args);
  }

  public async test(_action: IAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IAction): Promise<IActorContextPreprocessOutput> {
    let context = action.context;

    // Wrap sources in skolemized sources
    if (context.has(KeysQueryOperation.querySources)) {
      // Determine map of source id's
      if (!context.has(KeysQuerySourceIdentify.sourceIds)) {
        context = context.set(KeysQuerySourceIdentify.sourceIds, new Map());
      }
      const sourceIds: Map<QuerySourceReference, string> = context.getSafe(KeysQuerySourceIdentify.sourceIds);

      let sources: IQuerySourceWrapper[] = context.getSafe(KeysQueryOperation.querySources);
      sources = sources.map(sourceWrapper => ({
        source: new QuerySourceSkolemized(sourceWrapper.source, getSourceId(sourceIds, sourceWrapper.source)),
        context: sourceWrapper.context,
      }));
      context = context.set(KeysQueryOperation.querySources, sources);
    }

    return { context };
  }
}
