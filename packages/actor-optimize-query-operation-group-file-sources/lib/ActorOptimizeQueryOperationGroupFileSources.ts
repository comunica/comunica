import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysQueryOperation, KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';

/**
 * A comunica Group File Sources Optimize Query Operation Actor.
 *
 * Optimizes federated queries over file sources by combining multiple
 * file sources (those identified with forceSourceType 'file') into a single 'compositefile' source.
 * This actor runs after source identification and before source skolemization.
 */
export class ActorOptimizeQueryOperationGroupFileSources extends ActorOptimizeQueryOperation {
  private static readonly updateOperationTypes = new Set<string>([
    'compositeupdate',
    'deleteinsert',
    'load',
    'clear',
    'create',
    'drop',
    'add',
    'move',
    'copy',
  ]);

  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;

  public constructor(args: IActorOptimizeQueryOperationGroupFileSourcesArgs) {
    super(args);
    this.mediatorQuerySourceIdentify = args.mediatorQuerySourceIdentify;
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    if (action.context.get(KeysQuerySourceIdentify.traverse)) {
      return failTest(`Actor ${this.name} does not work in traversal mode.`);
    }
    if (ActorOptimizeQueryOperationGroupFileSources.updateOperationTypes.has(action.operation.type)) {
      return failTest(`Actor ${this.name} does not work for SPARQL Update operations.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const querySources: IQuerySourceWrapper[] = action.context.get(KeysQueryOperation.querySources) ?? [];

    // Only optimize when there are at least 2 sources
    if (querySources.length < 2) {
      return { operation: action.operation, context: action.context };
    }

    // Identify file sources
    const fileSources = (await Promise.all(querySources
      .map(async wrapper => ({
        wrapper,
        filterFactor: await this.getFilterFactorSafe(wrapper, action.context),
      }))))
      .filter(entry => entry.filterFactor === 0)
      .map(entry => entry.wrapper);

    // Only optimize when there are at least 2 file sources
    if (fileSources.length < 2) {
      return { operation: action.operation, context: action.context };
    }

    // Create a single compositefile source via the mediator
    const { querySource: compositeWrapper } = await this.mediatorQuerySourceIdentify.mediate({
      querySourceUnidentified: { type: 'compositefile', value: fileSources },
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

  private async getFilterFactorSafe(sourceWrapper: IQuerySourceWrapper, context: any): Promise<number | undefined> {
    const firstLink = (<any> sourceWrapper.source).firstLink;
    // Only hypermedia sources can represent files.
    // If the source has a forced file type, then we know it's a file,
    // otherwise, we need to invoke getFilterFactor (which is more expensive due to the HTTP lookup).
    if (firstLink === undefined) {
      return undefined;
    }
    if (firstLink.forceSourceType === 'file') {
      return 0;
    }
    return sourceWrapper.source.getFilterFactor(context);
  }
}

export interface IActorOptimizeQueryOperationGroupFileSourcesArgs extends IActorOptimizeQueryOperationArgs {
  /**
   * The query source identify mediator.
   */
  mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
}
