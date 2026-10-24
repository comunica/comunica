import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  IActorRdfJoinOutputInner,
  IActorRdfJoinTestSideData,
  MediatorRdfJoin,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { failTest, passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, ComunicaDataFactory, IJoinEntry, MetadataBindings, TermsOrder } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { compareTerms } from '@comunica/utils-iterator';
import type * as RDF from '@rdfjs/types';
import { MultiMergeJoinIterator } from './MultiMergeJoinIterator';

/**
 * A comunica Multi Merge RDF Join Actor.
 *
 * Joins three or more entries that are all sorted on the same variable in one pass.
 * If they share a longer prefix of their term order, they are merged on all of it.
 *
 * Entries that are not sorted on that variable are joined with the result afterwards, through the join bus.
 */
export class ActorRdfJoinMultiMerge extends ActorRdfJoin<IActorRdfJoinMultiMergeTestSideData> {
  /**
   * The cost of reading one binding when every merged entry can skip, as for the merge join.
   */
  public static readonly ITERATION_COST_ORDERED = 0.8;
  /**
   * The cost of reading one binding otherwise, as for the merge join.
   */
  public static readonly ITERATION_COST = 1;
  /**
   * The minimum number of entries to merge, below which a merge join does the same.
   */
  public static readonly MIN_ENTRIES = 3;
  /**
   * How many times smaller than the merged result another entry must be for this actor to leave the join
   * to actors that start from that entry, such as the bind join.
   */
  public static readonly OTHER_ENTRY_RATIO = 2;

  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorRdfJoinMultiMergeArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'multi-merge',
      limitEntries: ActorRdfJoinMultiMerge.MIN_ENTRIES,
      limitEntriesMin: true,
      requiresVariableOverlap: true,
      canHandleUndefs: false,
    });
    this.mediatorJoin = args.mediatorJoin;
  }

  /**
   * Find the variable that most entries are sorted on first, in ascending order.
   * Among variables that equally many entries are sorted on, the one whose smallest entry is smallest wins.
   * @param metadatas Metadata of the join entries.
   * @return The variable and the indexes of the entries sorted on it, from the smallest entry to the largest,
   *         or undefined if there is none.
   */
  public static getMergeVariable(
    metadatas: MetadataBindings[],
  ): { variable: RDF.Variable; indexes: number[] } | undefined {
    const groups = new Map<string, { variable: RDF.Variable; indexes: number[]; smallest: number }>();
    for (const [ index, metadata ] of metadatas.entries()) {
      const first = metadata.termOrder?.[0];
      if (first?.direction !== 'asc' ||
        metadata.variables.some(entry => entry.canBeUndef && entry.variable.equals(first.term))) {
        continue;
      }
      let group = groups.get(first.term.value);
      if (!group) {
        group = { variable: first.term, indexes: [], smallest: Number.POSITIVE_INFINITY };
        groups.set(first.term.value, group);
      }
      group.indexes.push(index);
      group.smallest = Math.min(group.smallest, metadata.cardinality.value);
    }
    let best: { variable: RDF.Variable; indexes: number[]; smallest: number } | undefined;
    for (const group of groups.values()) {
      if (!best || group.indexes.length > best.indexes.length ||
        (group.indexes.length === best.indexes.length && group.smallest < best.smallest)) {
        best = group;
      }
    }
    if (!best) {
      return undefined;
    }
    // A key is checked against the entries in this order, so the smallest ones come first.
    const indexes = [ ...best.indexes ]
      .sort((left, right) => metadatas[left].cardinality.value - metadatas[right].cardinality.value);
    return { variable: best.variable, indexes };
  }

  /**
   * Determine the key that the merged entries are joined on.
   *
   * This is the longest prefix of their term orders that they all share, in ascending order, of variables that
   * none of them leaves undefined. It starts with the merge variable, and merging on more variables avoids
   * checking the other ones within the cross product of the runs of every key.
   * @param variable The variable that the merged entries are sorted on first.
   * @param metadatas Metadata of the merged entries.
   */
  public static getMergeKey(variable: RDF.Variable, metadatas: MetadataBindings[]): TermsOrder<RDF.Variable> {
    const key: TermsOrder<RDF.Variable> = [{ term: variable, direction: 'asc' }];
    for (const { term } of metadatas[0].termOrder!.slice(1)) {
      const index = key.length;
      if (!metadatas.every(metadata => metadata.termOrder![index]?.term.equals(term) &&
        metadata.termOrder![index].direction === 'asc' &&
        metadata.variables.some(entry => entry.variable.equals(term) && !entry.canBeUndef))) {
        break;
      }
      key.push({ term, direction: 'asc' });
    }
    return key;
  }

  protected async getOutput(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinMultiMergeTestSideData,
  ): Promise<IActorRdfJoinOutputInner> {
    const { variable, indexes } = sideData;
    const entries = indexes.map(index => action.entries[index]);
    const metadatas = indexes.map(index => sideData.metadatas[index]);
    const termOrder = ActorRdfJoinMultiMerge.getMergeKey(variable, metadatas);
    const compareFirst = (left: Bindings, right: Bindings): number =>
      compareTerms(left.get(variable)!, right.get(variable)!);
    const keyVariables = termOrder.map(entry => entry.term);
    const compareAll = (left: Bindings, right: Bindings): number => {
      for (const keyVariable of keyVariables) {
        const comparison = compareTerms(left.get(keyVariable)!, right.get(keyVariable)!);
        if (comparison !== 0) {
          return comparison;
        }
      }
      return 0;
    };
    const compareKey = keyVariables.length === 1 ? compareFirst : compareAll;
    const bindingsStream = new MultiMergeJoinIterator(
      entries.map(entry => entry.output.bindingsStream),
      compareKey,
      MultiMergeJoinIterator.SEEK_AFTER_BEHIND,
      compareFirst,
    );
    const canSeek = metadatas.every(metadata => metadata.canSeek);
    const output = {
      type: <const> 'bindings',
      bindingsStream,
      metadata: async() => await this.constructResultMetadata(entries, metadatas, action.context, {
        termOrder,
        canSeek,
      }),
    };

    const rest = action.entries.filter((_, index) => !indexes.includes(index));
    if (rest.length === 0) {
      return { result: output };
    }

    // Join the other entries with the result, which stays sorted, so that further merges remain possible.
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    const joined: IJoinEntry = {
      output,
      operation: algebraFactory.createJoin(entries.map(entry => entry.operation), false),
    };
    return {
      result: await this.mediatorJoin.mediate({
        type: action.type,
        entries: [ joined, ...rest ],
        context: action.context,
      }),
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinMultiMergeTestSideData>> {
    const { metadatas } = sideData;
    const group = ActorRdfJoinMultiMerge.getMergeVariable(metadatas);
    if (!group || group.indexes.length < ActorRdfJoinMultiMerge.MIN_ENTRIES) {
      return failTest(`Actor ${this.name} can only join at least ${ActorRdfJoinMultiMerge.MIN_ENTRIES} entries that are sorted on a shared variable`);
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    const grouped = group.indexes.map(index => metadatas[index]);

    // The smallest entry proposes every key, and a later entry is only read at the keys that all entries
    // before it share, of which there are about as many as their estimated join result. An entry that can skip
    // is read down to about that many bindings, as for the merge join, and one that cannot is read in full.
    let reads = grouped[0].cardinality.value;
    let keys = reads;
    for (let i = 1; i < grouped.length; i++) {
      const cardinality = grouped[i].cardinality.value;
      reads += grouped[i].canSeek ? Math.min(cardinality, keys) : cardinality;
      // The entries share the key variable, so the estimate always exists.
      keys = Math.min(keys, ActorRdfJoin.getSharedVariableJoinCardinality(grouped.slice(0, i + 1))!);
    }

    // Another entry that is much smaller than the result can only be joined after every key has been produced, while
    // binding it into the merged entries only looks up its own bindings. Such an entry is usually a join, whose
    // estimate tends to be too high, so its actual advantage is often larger still.
    if (metadatas.some((metadata, index) => !group.indexes.includes(index) &&
      metadata.cardinality.value * ActorRdfJoinMultiMerge.OTHER_ENTRY_RATIO < keys)) {
      return failTest(`Actor ${this.name} leaves joins with an entry much smaller than its result to other actors`);
    }

    const perBinding = grouped.every(metadata => metadata.canSeek) ?
      ActorRdfJoinMultiMerge.ITERATION_COST_ORDERED :
      ActorRdfJoinMultiMerge.ITERATION_COST;
    let iterations = reads * perBinding;

    // The other entries are joined with the result one at a time afterwards, as the multi-smallest join does.
    let rows = keys;
    for (const [ index, metadata ] of metadatas.entries()) {
      if (!group.indexes.includes(index)) {
        iterations += rows + metadata.cardinality.value;
        rows = Math.min(rows, metadata.cardinality.value);
      }
    }

    return passTestWithSideData({
      iterations,
      // Only one run per entry is held in memory.
      persistedItems: 0,
      blockingItems: 0,
      requestTime: metadatas.reduce((sum, metadata, i) => sum + requestInitialTimes[i] +
        metadata.cardinality.value * requestItemTimes[i], 0),
    }, { ...sideData, ...group });
  }
}

export interface IActorRdfJoinMultiMergeArgs extends IActorRdfJoinArgs<IActorRdfJoinMultiMergeTestSideData> {
  /**
   * A mediator for joining the entries that are not merged with the result.
   */
  mediatorJoin: MediatorRdfJoin;
}

export interface IActorRdfJoinMultiMergeTestSideData extends IActorRdfJoinTestSideData {
  /**
   * The variable that the merged entries are sorted on.
   */
  variable: RDF.Variable;
  /**
   * The indexes of the entries that are merged.
   */
  indexes: number[];
}
