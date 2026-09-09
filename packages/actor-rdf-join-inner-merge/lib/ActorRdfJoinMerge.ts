import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  IActorRdfJoinOutputInner,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
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
 * but it is only applicable when both entries advertise a compatible `order` in their metadata.
 */
export class ActorRdfJoinMerge extends ActorRdfJoin<IActorRdfJoinMergeTestSideData> {
  public readonly mediatorTermComparatorFactory: MediatorTermComparatorFactory;

  public constructor(args: IActorRdfJoinMergeArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'merge',
      limitEntries: 2,
      requiresVariableOverlap: true,
      canHandleUndefs: false,
    });
    this.mediatorTermComparatorFactory = args.mediatorTermComparatorFactory;
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
    const orderLeft = metadatas[0].order;
    const orderRight = metadatas[1].order;
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
    const termComparator = await this.mediatorTermComparatorFactory.mediate({ context: action.context });
    const bindingsStream = new MergeJoinIterator(
      entriesSorted[0].output.bindingsStream,
      entriesSorted[1].output.bindingsStream,
      createKeyComparator(termComparator, mergeKey),
    );
    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: async() => await this.constructResultMetadata(entriesSorted, metadatas, action.context, {
          // Merging preserves the order of the key that was merged on, so chained merge joins stay applicable.
          order: mergeKey,
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
    return passTestWithSideData({
      // Both entries are read exactly once, sequentially, with no lookups in between.
      iterations: metadatas[0].cardinality.value + metadatas[1].cardinality.value,
      // Only one run of equal keys from the smallest entry is held in memory. The number of distinct keys is
      // estimated as the cardinality of the largest entry, matching the assumption that
      // `ActorRdfJoin.getSharedVariableJoinCardinality` already makes. This underestimates skewed keys.
      persistedItems: metadatas[1].cardinality.value / Math.max(1, metadatas[0].cardinality.value),
      // Results are emitted while both entries are still being read, so nothing is blocking.
      blockingItems: 0,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality.value * requestItemTimes[1],
    }, { ...sideData, metadatas, entriesSorted, mergeKey });
  }
}

export interface IActorRdfJoinMergeArgs extends IActorRdfJoinArgs<IActorRdfJoinMergeTestSideData> {
  /**
   * The mediator for creating a term comparator following the SPARQL order semantics.
   */
  mediatorTermComparatorFactory: MediatorTermComparatorFactory;
}

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
