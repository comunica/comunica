import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { AlgebraFactory, algebraUtils, Algebra } from '@comunica/utils-algebra';
import {
  assignOperationSource,
  getOperationSource,
  removeOperationSource,
} from '@comunica/utils-query-operation';

/**
 * A comunica Group File Sources Optimize Query Operation Actor.
 *
 * Optimizes federated queries over file sources by combining multiple
 * 'file' source types into a single 'compositefile' source.
 */
export class ActorOptimizeQueryOperationGroupFileSources extends ActorOptimizeQueryOperation {
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;

  public constructor(args: IActorOptimizeQueryOperationGroupFileSourcesArgs) {
    super(args);
    this.mediatorQuerySourceIdentify = args.mediatorQuerySourceIdentify;
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    if (getOperationSource(action.operation)) {
      return failTest(`Actor ${this.name} does not work with top-level operation sources.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const querySources: IQuerySourceWrapper[] = action.context.get(KeysQueryOperation.querySources) ?? [];

    // Identify file sources from the list of all sources
    const fileSources = querySources.filter(
      wrapper => ActorOptimizeQueryOperationGroupFileSources.isFileSource(wrapper),
    );

    // Only optimize when there are at least 2 file sources
    if (fileSources.length < 2) {
      return { operation: action.operation, context: action.context };
    }

    const dataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // Collect all file URLs
    const fileUrls = fileSources.map(wrapper => <string> wrapper.source.referenceValue);

    // Create a single compositefile source via the mediator
    const { querySource: compositeWrapper } = await this.mediatorQuerySourceIdentify.mediate({
      querySourceUnidentified: <any> { type: 'compositefile', value: fileUrls },
      context: action.context,
    });

    // Build a set of file source wrappers for quick lookup
    const fileSourceSet = new Set(fileSources);

    // Transform the operation tree: replace UNION nodes containing multiple file-source children
    // with a single child annotated with the compositefile source.
    const newOperation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.UNION]: {
        transform: (subOp) => {
          const fileChildren = subOp.input.filter(
            child => fileSourceSet.has(getOperationSource(child)!),
          );
          const otherChildren = subOp.input.filter(
            child => !fileSourceSet.has(getOperationSource(child)!),
          );

          // Only group when there are at least 2 file-annotated children
          if (fileChildren.length < 2) {
            return subOp;
          }

          // Use the first file child as a template (remove its source annotation)
          // All file children represent the same pattern – only differ in source annotation
          const templateChild = { ...fileChildren[0] };
          removeOperationSource(templateChild);
          const compositeChild = assignOperationSource(templateChild, compositeWrapper);

          const newChildren = [ compositeChild, ...otherChildren ];
          if (newChildren.length === 1) {
            return newChildren[0];
          }
          return algebraFactory.createUnion(newChildren, false);
        },
      },
    });

    // Update querySources in context to reflect the new composite source
    const newQuerySources = [
      ...querySources.filter(s => !fileSourceSet.has(s)),
      compositeWrapper,
    ];

    return {
      operation: newOperation,
      context: action.context.set(KeysQueryOperation.querySources, newQuerySources),
    };
  }

  /**
   * Check if a query source wrapper represents a file source.
   * File sources are identified as QuerySourceRdfJs instances with a string URL reference value.
   * @param wrapper A query source wrapper.
   */
  public static isFileSource(wrapper: IQuerySourceWrapper): boolean {
    return wrapper.source instanceof QuerySourceRdfJs && typeof wrapper.source.referenceValue === 'string';
  }
}

export interface IActorOptimizeQueryOperationGroupFileSourcesArgs extends IActorOptimizeQueryOperationArgs {
  /**
   * The query source identify mediator.
   */
  mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
}
