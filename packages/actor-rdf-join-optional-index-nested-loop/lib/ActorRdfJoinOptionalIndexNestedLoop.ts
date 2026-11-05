import type { IIndexNestedLoopLookup } from '@comunica/actor-rdf-join-inner-multi-index-nested-loop';
import {
  ActorRdfJoinMultiIndexNestedLoop,
  getArbitraryLengthPathLookup,
  IndexNestedLoopIterator,
} from '@comunica/actor-rdf-join-inner-multi-index-nested-loop';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
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
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getOperationSource } from '@comunica/utils-query-operation';

/**
 * A comunica Optional Index Nested Loop RDF Join Actor.
 */
export class ActorRdfJoinOptionalIndexNestedLoop extends ActorRdfJoin {
  public readonly selectivityModifier: number;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorRdfJoinOptionalIndexNestedLoopArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: 'index-nested-loop',
      limitEntries: 2,
      canHandleUndefs: true,
      requiresVariableOverlap: true,
    });
    this.selectivityModifier = args.selectivityModifier;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    action.entries[1].output.bindingsStream.destroy();
    const operation = action.entries[1].operation;
    const sourceWrapper = <IQuerySourceWrapper> getOperationSource(operation);
    const lookups: IIndexNestedLoopLookup[] = [{
      operation,
      source: sourceWrapper.source,
      context: sourceWrapper.context ? action.context.merge(sourceWrapper.context) : action.context,
      optional: true,
    }];
    // Quad patterns are bound without bindings factory, so it is only created for other operations.
    const bindingsFactory = IndexNestedLoopIterator.needsBindingsFactory(lookups) ?
      await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context, dataFactory) :
      undefined;
    return {
      result: {
        type: 'bindings',
        bindingsStream: new IndexNestedLoopIterator(
          action.entries[0].output.bindingsStream,
          lookups,
          new AlgebraFactory(dataFactory),
          bindingsFactory,
        ),
        metadata: async() => {
          const metadatas = await ActorRdfJoin.getMetadatas(action.entries);
          return await this.constructResultMetadata(
            action.entries,
            metadatas,
            action.context,
            { termOrder: metadatas[0].termOrder },
            true,
          );
        },
      },
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    const { metadatas } = sideData;
    if (!await ActorRdfJoinMultiIndexNestedLoop.canLookUp(action.entries[1], action.context)) {
      return failTest(`Actor ${this.name} requires a right entry that is an operation over a source that supports synchronous lookups`);
    }
    // Paths can only be looked up from a bound term, which is not guaranteed for the optional left bindings.
    if (getArbitraryLengthPathLookup(action.entries[1].operation)) {
      return failTest(`Actor ${this.name} can not look up arbitrary length paths`);
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
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
