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
import type { Bindings, ComunicaDataFactory, IJoinEntry, MetadataBindings } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { compareTerms } from '@comunica/utils-iterator';
import type * as RDF from '@rdfjs/types';
import { LeapfrogJoinIterator } from './LeapfrogJoinIterator';

/**
 * A comunica Multi Leapfrog RDF Join Actor.
 *
 * Joins three or more entries that are all sorted on the same variable in one pass, with a leapfrog join:
 * every entry that is behind skips ahead to the furthest key among all entries. This is the join of a single
 * level of a leapfrog triejoin, over the variable that the entries are sorted on first.
 *
 * Entries that are not sorted on that variable are joined with the result afterwards, through the join bus.
 */
export class ActorRdfJoinMultiLeapfrog extends ActorRdfJoin<IActorRdfJoinMultiLeapfrogTestSideData> {
  /**
   * The cost of reading one binding when every leapfrogged entry can skip, as for the merge join.
   */
  public static readonly ITERATION_COST_ORDERED = 0.8;
  /**
   * The cost of reading one binding otherwise, as for the merge join.
   */
  public static readonly ITERATION_COST = 1;
  /**
   * The minimum number of entries to leapfrog, below which a merge join does the same.
   */
  public static readonly MIN_ENTRIES = 3;

  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorRdfJoinMultiLeapfrogArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'multi-leapfrog',
      limitEntries: ActorRdfJoinMultiLeapfrog.MIN_ENTRIES,
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
  public static getLeapfrogVariable(
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

  protected async getOutput(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinMultiLeapfrogTestSideData,
  ): Promise<IActorRdfJoinOutputInner> {
    const { variable, indexes } = sideData;
    const entries = indexes.map(index => action.entries[index]);
    const metadatas = indexes.map(index => sideData.metadatas[index]);
    const bindingsStream = new LeapfrogJoinIterator(
      entries.map(entry => entry.output.bindingsStream),
      (left: Bindings, right: Bindings) => compareTerms(left.get(variable)!, right.get(variable)!),
    );
    const termOrder = [{ term: variable, direction: <const> 'asc' }];
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
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinMultiLeapfrogTestSideData>> {
    const { metadatas } = sideData;
    const leapfrog = ActorRdfJoinMultiLeapfrog.getLeapfrogVariable(metadatas);
    if (!leapfrog || leapfrog.indexes.length < ActorRdfJoinMultiLeapfrog.MIN_ENTRIES) {
      return failTest(`Actor ${this.name} can only join at least ${ActorRdfJoinMultiLeapfrog.MIN_ENTRIES} entries that are sorted on a shared variable`);
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    const grouped = leapfrog.indexes.map(index => metadatas[index]);

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
    const perBinding = grouped.every(metadata => metadata.canSeek) ?
      ActorRdfJoinMultiLeapfrog.ITERATION_COST_ORDERED :
      ActorRdfJoinMultiLeapfrog.ITERATION_COST;
    let iterations = reads * perBinding;

    // The other entries are joined with the result one at a time afterwards, as the multi-smallest join does.
    let rows = keys;
    for (const [ index, metadata ] of metadatas.entries()) {
      if (!leapfrog.indexes.includes(index)) {
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
    }, { ...sideData, ...leapfrog });
  }
}

export interface IActorRdfJoinMultiLeapfrogArgs extends IActorRdfJoinArgs<IActorRdfJoinMultiLeapfrogTestSideData> {
  /**
   * A mediator for joining the entries that are not leapfrogged with the result.
   */
  mediatorJoin: MediatorRdfJoin;
}

export interface IActorRdfJoinMultiLeapfrogTestSideData extends IActorRdfJoinTestSideData {
  /**
   * The variable that the leapfrogged entries are sorted on.
   */
  variable: RDF.Variable;
  /**
   * The indexes of the entries that are leapfrogged.
   */
  indexes: number[];
}
