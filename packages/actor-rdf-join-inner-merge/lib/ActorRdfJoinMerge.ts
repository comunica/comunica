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
  /**
   * The cost of reading one binding, relative to the 0.8 the non-undef hash join claims per binding.
   *
   * Set to 1 so that a merge join which cannot skip never wins: the hash join's advantage of 0.8 per
   * binding always outweighs the memory and blocking this actor saves, whatever the two cardinalities.
   * A merge join is then chosen only on the strength of what skipping saves.
   */
  public static readonly ITERATION_COST = 1;

  /**
   * The cost of reading one binding when both entries are ordered sources.
   *
   * Equal to the hash join's, so that a merge between two such entries is chosen on the strength of
   * holding only one run instead of a whole entry, and of not blocking. Its output is ordered, which no
   * pairwise cost can express: a chain of merges is what carries an order down to an entry large enough
   * for skipping to pay, and costing the first link above the hash join breaks the chain.
   */
  public static readonly ITERATION_COST_ORDERED = 0.8;

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
    const cardinalityBig = metadatas[0].cardinality.value;
    const cardinalitySmall = metadatas[1].cardinality.value;

    // Reading both entries in order costs a comparison per binding, against a hash probe per binding
    // for the hash join. Measured on join inputs that are themselves joins, that comparison is the more
    // expensive of the two, so a merge that has to read both entries in full is never the cheaper plan.
    //
    // What makes it cheaper is skipping. A sorted entry that can seek drops the bindings between one
    // match and the next without producing them, so the large entry is read down to roughly the size of
    // the join result: over a scan of 447539 bindings that produced 181401 results, 182881 were read.
    const joined = ActorRdfJoin.getSharedVariableJoinCardinality(metadatas) ?? cardinalitySmall;
    const readBig = metadatas[0].canSeek ? Math.min(cardinalityBig, joined) : cardinalityBig;

    // When both entries are ordered sources, the merge is at parity per binding with the hash join and
    // its output stays ordered, which is what lets a chain of merges reach a large entry that can skip.
    // Costing that first merge above the hash join breaks the chain and loses the skip entirely, so it
    // is charged the same per binding as the hash join rather than the premium above.
    const perBinding = metadatas[0].canSeek && metadatas[1].canSeek ?
      ActorRdfJoinMerge.ITERATION_COST_ORDERED :
      ActorRdfJoinMerge.ITERATION_COST;
    const iterations = (readBig + cardinalitySmall) * perBinding;

    return passTestWithSideData({
      iterations,
      // Only one run of equal keys from the smallest entry is held in memory. The number of distinct keys is
      // estimated as the cardinality of the largest entry, matching the assumption that
      // `ActorRdfJoin.getSharedVariableJoinCardinality` already makes. This underestimates skewed keys.
      persistedItems: cardinalitySmall / Math.max(1, cardinalityBig),
      // Results are emitted while both entries are still being read, so nothing is blocking.
      blockingItems: 0,
      requestTime: requestInitialTimes[0] + cardinalityBig * requestItemTimes[0] +
        requestInitialTimes[1] + cardinalitySmall * requestItemTimes[1],
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
