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
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { getOperationSource } from '@comunica/utils-query-operation';

/**
 * A comunica Optional Index Nested Loop RDF Join Actor.
 *
 * Joins the bindings of the left entry with a quad pattern on the right,
 * by looking up the pattern bound to each left binding, and keeping left bindings without results.
 * As for the inner index nested-loop join, bound patterns are sent to their source directly,
 * which requires a source that can look them up synchronously.
 * It is estimated like the optional bind join, which it replaces wherever both apply.
 */
export class ActorRdfJoinOptionalIndexNestedLoop extends ActorRdfJoin {
  public readonly selectivityModifier: number;

  public constructor(args: IActorRdfJoinOptionalIndexNestedLoopArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: 'index-nested-loop',
      limitEntries: 2,
      canHandleUndefs: true,
      requiresVariableOverlap: true,
    });
    this.selectivityModifier = args.selectivityModifier;
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
    if (!await ActorRdfJoinMultiIndexNestedLoop.canLookUp(action.entries[1], action.context)) {
      return failTest(`Actor ${this.name} requires a right entry that is a quad pattern over a source that supports synchronous lookups`);
    }

    const selectivity = (await this.mediatorJoinSelectivity.mediate({
      entries: action.entries,
      context: action.context,
    })).selectivity * this.selectivityModifier;
    return passTestWithSideData({
      // The same estimate as the optional bind join, which only differs in the selectivity modifier.
      iterations: metadatas[0].cardinality.value * metadatas[1].cardinality.value * selectivity,
      persistedItems: 0,
      blockingItems: 0,
      // Only the left entry is requested, as lookups are synchronous.
      requestTime: ActorRdfJoin.getRequestInitialTimes(metadatas)[0] +
        metadatas[0].cardinality.value * ActorRdfJoin.getRequestItemTimes(metadatas)[0],
    }, sideData);
  }
}

export interface IActorRdfJoinOptionalIndexNestedLoopArgs extends IActorRdfJoinArgs {
  /**
   * Multiplier for selectivity values.
   * This defaults to half the one of the optional bind join, so that this actor is preferred where both apply,
   * as it does the same, without planning and awaiting a lookup per binding.
   * @range {double}
   * @default {0.0000005}
   */
  selectivityModifier: number;
}
