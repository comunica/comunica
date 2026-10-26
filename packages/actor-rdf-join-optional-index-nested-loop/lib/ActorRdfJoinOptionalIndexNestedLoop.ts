import {
  ActorRdfJoinMultiIndexNestedLoop,
  IndexNestedLoopIterator,
} from '@comunica/actor-rdf-join-inner-multi-index-nested-loop';
import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  IActorRdfJoinOutputInner,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { failTest, passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { ComunicaDataFactory, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { getOperationSource } from '@comunica/utils-query-operation';

/**
 * A comunica Optional Index Nested Loop RDF Join Actor.
 *
 * Joins the bindings of the left entry with a quad pattern on the right,
 * by looking up the pattern bound to each left binding, and keeping left bindings without results.
 * As for the inner index nested-loop join, bound patterns are sent to their source directly,
 * which requires a source that can look them up synchronously.
 */
export class ActorRdfJoinOptionalIndexNestedLoop extends ActorRdfJoin {
  public readonly lookupCost: number;

  public constructor(args: IActorRdfJoinOptionalIndexNestedLoopArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: 'index-nested-loop',
      limitEntries: 2,
      canHandleUndefs: true,
      requiresVariableOverlap: true,
    });
    this.lookupCost = args.lookupCost;
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    action.entries[1].output.bindingsStream.destroy();
    const pattern = <Algebra.Pattern> action.entries[1].operation;
    const sourceWrapper = <IQuerySourceWrapper> getOperationSource(pattern);
    return {
      result: {
        type: 'bindings',
        bindingsStream: new IndexNestedLoopIterator(
          action.entries[0].output.bindingsStream,
          [{
            pattern,
            source: sourceWrapper.source,
            context: sourceWrapper.context ? action.context.merge(sourceWrapper.context) : action.context,
            optional: true,
          }],
          new AlgebraFactory(dataFactory),
        ),
        metadata: async() => await this.constructResultMetadata(
          action.entries,
          await ActorRdfJoin.getMetadatas(action.entries),
          action.context,
          {},
          true,
        ),
      },
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    const { metadatas } = sideData;
    if (metadatas.some(metadata => metadata.pageSize ?? metadata.requestTime)) {
      return failTest(`Actor ${this.name} can only join entries from local sources`);
    }
    const right = action.entries[1];
    if (right.operation.type !== Algebra.Types.PATTERN || Boolean(right.operationModified) ||
      !getOperationSource(right.operation)?.source.queryBindingsSynchronous) {
      return failTest(`Actor ${this.name} requires a right entry that is a quad pattern over a source that supports synchronous lookups`);
    }

    const bound = new Set(metadatas[0].variables.map(variable => variable.variable.value));
    const fanout = ActorRdfJoinMultiIndexNestedLoop.estimateFanout({ ...right, metadata: metadatas[1] }, bound);
    return passTestWithSideData({
      iterations: metadatas[0].cardinality.value * (this.lookupCost + Math.max(1, fanout)),
      persistedItems: 0,
      blockingItems: 0,
      requestTime: 0,
    }, sideData);
  }
}

export interface IActorRdfJoinOptionalIndexNestedLoopArgs extends IActorRdfJoinArgs {
  /**
   * The cost of looking up a single bound pattern, expressed in produced rows.
   * @range {double}
   * @default {1}
   */
  lookupCost: number;
}
