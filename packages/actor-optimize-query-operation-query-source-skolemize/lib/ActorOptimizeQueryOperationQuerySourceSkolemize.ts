import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysQueryOperation, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { IQuerySourceWrapper, QuerySourceReference } from '@comunica/types';
import { QuerySourceSkolemized } from './QuerySourceSkolemized';
import { getSourceId } from './utils';

/**
 * A comunica Query Source Skolemize Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationQuerySourceSkolemize extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
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

    return { context, operation: action.operation };
  }
}
