import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  IActorRdfJoinOutputInner,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { TestResult } from '@comunica/core';
import { failTest, passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IJoinEntry, MetadataBindings, TermsOrder } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { createKeyComparator, MergeJoinIterator } from './MergeJoinIterator';

/**
 * A comunica Merge RDF Join Actor.
 *
 * Joins two streams that both already arrive sorted on a shared join variable, by reading each side once and
 * always advancing the side that is behind. This does no per-binding lookup and never blocks on a full side,
 * but it is only applicable when both entries advertise a compatible `termOrder` in their metadata.
 * That is the order in which it compares keys, so an entry that is only sorted in the SPARQL `order` does not qualify.
 */
export class ActorRdfJoinMerge extends ActorRdfJoin<IActorRdfJoinMergeTestSideData> {
  /**
   * The cost of reading one binding, relative to the 0.8 the non-undef hash join claims per binding.
   */
  public static readonly ITERATION_COST = 1;

  /**
   * The cost of reading one binding when both entries are ordered sources.
   */
  public static readonly ITERATION_COST_ORDERED = 0.8;

  public constructor(args: IActorRdfJoinMergeArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'merge',
      limitEntries: 2,
      requiresVariableOverlap: true,
      canHandleUndefs: false,
    });
  }

  /**
   * Determine the join key that both entries are sorted on.
   *
   * This is the longest common prefix of both orders that consists of shared variables sorted in the same
   * direction. A stream sorted on (a, b, c) is also sorted on (a, b) and on (a), so any such prefix is safe to
   * merge on. An empty result means the entries cannot be merge-joined.
   * @param metadatas Metadata of the join entries.
   */
  public static getCommonOrderPrefix(metadatas: MetadataBindings[]): TermsOrder<RDF.Variable> {
    const orderLeft = metadatas[0].termOrder;
    const orderRight = metadatas[1].termOrder;
    if (!orderLeft || !orderRight) {
      return [];
    }
    const shared = new Set(ActorRdfJoin.overlappingVariables(metadatas).map(entry => entry.variable.value));
    const prefix: TermsOrder<RDF.Variable> = [];
    for (let i = 0; i < Math.min(orderLeft.length, orderRight.length); i++) {
      const left = orderLeft[i];
      const right = orderRight[i];
      if (left.term.value !== right.term.value) {
        break;
      }
      if (left.direction !== right.direction) {
        break;
      }
      if (!shared.has(left.term.value)) {
        break;
      }
      prefix.push(left);
    }
    return prefix;
  }

  protected async getOutput(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinMergeTestSideData,
  ): Promise<IActorRdfJoinOutputInner> {
    const { entriesSorted, metadatas, mergeKey } = sideData;
    const bindingsStream = new MergeJoinIterator(
      entriesSorted[0].output.bindingsStream,
      entriesSorted[1].output.bindingsStream,
      createKeyComparator(mergeKey),
    );
    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: async() => await this.constructResultMetadata(entriesSorted, metadatas, action.context, {
          // Merging preserves the order of the key that was merged on, so chained merge joins stay applicable.
          termOrder: mergeKey,
        }),
      },
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinMergeTestSideData>> {
    const mergeKey = ActorRdfJoinMerge.getCommonOrderPrefix(sideData.metadatas);
    if (mergeKey.length === 0) {
      return failTest(`Actor ${this.name} can only join entries that are sorted on a shared variable`);
    }

    // Stream the largest entry and buffer runs from the smallest one, to keep the buffered run small.
    let entriesSorted = action.entries;
    let metadatas = sideData.metadatas;
    if (metadatas[0].cardinality.value < metadatas[1].cardinality.value) {
      entriesSorted = [ action.entries[1], action.entries[0] ];
      metadatas = [ metadatas[1], metadatas[0] ];
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    const cardinalityBig = metadatas[0].cardinality.value;
    const cardinalitySmall = metadatas[1].cardinality.value;

    const joined = ActorRdfJoin.getSharedVariableJoinCardinality(metadatas) ?? cardinalitySmall;
    const readBig = metadatas[0].canSeek ? Math.min(cardinalityBig, joined) : cardinalityBig;

    const perBinding = metadatas[0].canSeek && metadatas[1].canSeek ?
      ActorRdfJoinMerge.ITERATION_COST_ORDERED :
      ActorRdfJoinMerge.ITERATION_COST;
    const iterations = (readBig + cardinalitySmall) * perBinding;

    return passTestWithSideData({
      iterations,
      persistedItems: cardinalitySmall / Math.max(1, cardinalityBig),
      blockingItems: 0,
      requestTime: requestInitialTimes[0] + cardinalityBig * requestItemTimes[0] +
        requestInitialTimes[1] + cardinalitySmall * requestItemTimes[1],
    }, { ...sideData, metadatas, entriesSorted, mergeKey });
  }
}

export interface IActorRdfJoinMergeArgs extends IActorRdfJoinArgs<IActorRdfJoinMergeTestSideData> {}

export interface IActorRdfJoinMergeTestSideData extends IActorRdfJoinTestSideData {
  /**
   * The join entries, with the entry to stream first and the entry to buffer runs from second.
   */
  entriesSorted: IJoinEntry[];
  /**
   * The order prefix that both entries are sorted on.
   */
  mergeKey: TermsOrder<RDF.Variable>;
}
