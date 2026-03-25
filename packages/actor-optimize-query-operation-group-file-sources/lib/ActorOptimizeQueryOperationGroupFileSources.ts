import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';

/**
 * A comunica Group File Sources Optimize Query Operation Actor.
 *
 * Optimizes federated queries over file sources by combining multiple
 * file sources (those identified with forceSourceType 'file') into a single 'compositefile' source.
 * This actor runs after source identification and before source skolemization.
 */
export class ActorOptimizeQueryOperationGroupFileSources extends ActorOptimizeQueryOperation {
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;

  public constructor(args: IActorOptimizeQueryOperationGroupFileSourcesArgs) {
    super(args);
    this.mediatorQuerySourceIdentify = args.mediatorQuerySourceIdentify;
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const querySources: IQuerySourceWrapper[] = action.context.get(KeysQueryOperation.querySources) ?? [];

    // Identify file sources by checking for forceSourceType === 'file' on the underlying hypermedia source link.
    // This avoids calling getFilterFactor(), which would trigger lazy source loading (network I/O).
    const fileSources = querySources.filter(
      wrapper => (<any> wrapper.source).firstLink?.forceSourceType === 'file',
    );

    // Only optimize when there are at least 2 file sources
    if (fileSources.length < 2) {
      return { operation: action.operation, context: action.context };
    }

    // Collect all file URLs from the identified file sources
    const fileUrls = fileSources.map(wrapper => <string> wrapper.source.referenceValue);

    // Create a single compositefile source via the mediator
    const { querySource: compositeWrapper } = await this.mediatorQuerySourceIdentify.mediate({
      querySourceUnidentified: { type: 'compositefile', value: fileUrls },
      context: action.context,
    });

    // Update querySources in context: remove individual file sources, add composite source
    const fileSourceSet = new Set(fileSources);
    const newQuerySources = [
      ...querySources.filter(s => !fileSourceSet.has(s)),
      compositeWrapper,
    ];

    return {
      operation: action.operation,
      context: action.context.set(KeysQueryOperation.querySources, newQuerySources),
    };
  }
}

export interface IActorOptimizeQueryOperationGroupFileSourcesArgs extends IActorOptimizeQueryOperationArgs {
  /**
   * The query source identify mediator.
   */
  mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
}
