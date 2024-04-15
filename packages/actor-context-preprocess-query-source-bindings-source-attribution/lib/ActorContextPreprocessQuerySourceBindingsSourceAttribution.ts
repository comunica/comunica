import type { IActorContextPreprocessOutput, IActorContextPreprocessArgs } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysQueryOperation, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { IActorTest, IAction } from '@comunica/core';
import type { IQuerySourceWrapper, QuerySourceReference } from '@comunica/types';
import { QuerySourceAddSourceAttribution } from './QuerySourceAddSourceAttribution';
import { getSourceId } from '@comunica/actor-context-preprocess-query-source-skolemize';

/**
 * A comunica Query Source Bindings Source Attribution Context Preprocess Actor.
 */
export class ActorContextPreprocessQuerySourceBindingsSourceAttribution extends ActorContextPreprocess {
  public constructor(args: IActorContextPreprocessArgs) {
    console.log("CREATED")
    super(args);
  }

  public async test(_action: IAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IAction): Promise<IActorContextPreprocessOutput> {
    console.log("RUNNING");
    let context = action.context;

    // Determine map of source id's
    if (!context.has(KeysQuerySourceIdentify.sourceIds)) {
      context = context.set(KeysQuerySourceIdentify.sourceIds, new Map());
    }

    const sourceIds: Map<QuerySourceReference, string> = context.getSafe(KeysQuerySourceIdentify.sourceIds);
    // Wrap sources in query sources that add source attribution to bindings
    if (context.has(KeysQueryOperation.querySources)) {
      let sources: IQuerySourceWrapper[] = context.getSafe(KeysQueryOperation.querySources);
      sources = sources.map(sourceWrapper => ({
        source: new QuerySourceAddSourceAttribution(sourceWrapper.source, getSourceId(sourceIds, sourceWrapper.source)),
        context: sourceWrapper.context,
      }));
      context = context.set(KeysQueryOperation.querySources, sources);
    }

    return { context };
  }
}
