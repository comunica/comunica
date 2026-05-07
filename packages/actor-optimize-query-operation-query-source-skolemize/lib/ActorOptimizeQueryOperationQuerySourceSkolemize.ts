import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysQueryOperation, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { QuerySourceReference } from '@comunica/types';
import { QuerySourceSkolemized } from './QuerySourceSkolemized';
import { getSourceId } from './utils';

/**
 * A comunica Query Source Skolemize Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationQuerySourceSkolemize extends ActorOptimizeQueryOperation {
  /**
   * @param args Arguments for this actor.
   */
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  /**
   * Tests whether this actor can handle the given optimize action.
   * @param _action The optimize query operation action.
   * @return A passing test result.
   */
  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  /**
   * Wraps all query sources and service sources in skolemized wrappers.
   * @param action The optimize query operation action.
   * @return The output with skolemized sources in the context.
   */
  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    let context = action.context;

    // Determine map of source id's
    if (!context.has(KeysQuerySourceIdentify.sourceIds)) {
      context = context.set(KeysQuerySourceIdentify.sourceIds, new Map());
    }
    const sourceIds: Map<QuerySourceReference, string> = context.getSafe(KeysQuerySourceIdentify.sourceIds);

    // Wrap sources in skolemized sources
    if (context.has(KeysQueryOperation.querySources)) {
      let sources = context.getSafe(KeysQueryOperation.querySources);
      sources = sources.map(sourceWrapper => ({
        source: new QuerySourceSkolemized(sourceWrapper.source, getSourceId(sourceIds, sourceWrapper.source)),
        context: sourceWrapper.context,
      }));
      context = context.set(KeysQueryOperation.querySources, sources);
    }

    // Wrap service sources in skolemized sources
    if (context.has(KeysQueryOperation.serviceSources)) {
      let sources = context.getSafe(KeysQueryOperation.serviceSources);
      sources = Object.fromEntries(Object.entries(sources).map(([ key, sourceWrapper ]) => ([
        key,
        {
          source: new QuerySourceSkolemized(sourceWrapper.source, getSourceId(sourceIds, sourceWrapper.source)),
          context: sourceWrapper.context,
        },
      ])));
      context = context.set(KeysQueryOperation.serviceSources, sources);
    }

    return { context, operation: action.operation };
  }
}
