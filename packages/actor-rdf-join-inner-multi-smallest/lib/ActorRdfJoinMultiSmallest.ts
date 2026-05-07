import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  MediatorRdfJoin,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  IJoinEntry,
  IActionContext,
  IJoinEntryWithMetadata,
  ComunicaDataFactory,
} from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { getSafeBindings } from '@comunica/utils-query-operation';

/**
 * A Multi Smallest RDF Join Actor.
 * It accepts 3 or more streams, joins the smallest two, and joins the result with the remaining streams.
 */
export class ActorRdfJoinMultiSmallest extends ActorRdfJoin<IActorRdfJoinMultiSmallestTestSideData> {
  public readonly mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
  public readonly mediatorJoin: MediatorRdfJoin;

  /**
   * Creates an instance of {@link ActorRdfJoinMultiSmallest}.
   * @param args The arguments for this actor.
   */
  public constructor(args: IActorRdfJoinMultiSmallestArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'multi-smallest',
      limitEntries: 3,
      limitEntriesMin: true,
      canHandleUndefs: true,
      isLeaf: false,
    });
    this.mediatorJoinEntriesSort = args.mediatorJoinEntriesSort;
    this.mediatorJoin = args.mediatorJoin;
  }

  /**
   * Finds join indexes of lowest cardinality result sets, with priority on result sets that have common variables
   * @param entries A sorted array of entries, sorted on cardinality
   */
  public getJoinIndexes(entries: IJoinEntryWithMetadata[]): [number, number] {
    // Iterate over all combinations of join indexes,
    // return the first combination that does not lead to a cartesian product
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (this.hasCommonVariables(entries[i], entries[j])) {
          return [ i, j ];
        }
      }
    }
    // If all result sets are disjoint we just want the sets with lowest cardinality
    return [ 0, 1 ];
  }

  /**
   * Checks whether two join entries share at least one common variable.
   * @param entry1 The first join entry with metadata.
   * @param entry2 The second join entry with metadata.
   * @return `true` if the entries have at least one variable in common, `false` otherwise.
   */
  public hasCommonVariables(entry1: IJoinEntryWithMetadata, entry2: IJoinEntryWithMetadata): boolean {
    const variableNames1 = entry1.metadata.variables.map(x => x.variable.value);
    const variableNames2 = new Set(entry2.metadata.variables.map(x => x.variable.value));
    return variableNames1.some(v => variableNames2.has(v));
  }

  /**
   * Order the given join entries using the join-entries-sort bus.
   * @param {IJoinEntryWithMetadata[]} entries An array of join entries.
   * @param context The action context.
   * @return {IJoinEntryWithMetadata[]} The sorted join entries.
   */
  public async sortJoinEntries(
    entries: IJoinEntryWithMetadata[],
    context: IActionContext,
  ): Promise<IJoinEntryWithMetadata[]> {
    return (await this.mediatorJoinEntriesSort.mediate({ entries, context })).entries;
  }

  /**
   * Produces the join output by joining the two smallest streams
   * and recursively joining the result with remaining entries.
   * @param action The join action to execute.
   * @param sideData Side data containing the sorted join entries.
   * @return The inner join output containing the combined result.
   */
  protected async getOutput(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinMultiSmallestTestSideData,
  ): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // Determine the two smallest streams by sorting (e.g. via cardinality)
    const entries: IJoinEntry[] = sideData.sortedEntries;
    const entriesMetaData = await ActorRdfJoin.getEntriesWithMetadatas(entries);
    const bestJoinIndexes: number[] = this.getJoinIndexes(entriesMetaData);

    const smallestEntry1 = entries[bestJoinIndexes[0]];
    const smallestEntry2 = entries[bestJoinIndexes[1]];
    entries.splice(bestJoinIndexes[1], 1);
    entries.splice(bestJoinIndexes[0], 1);

    // Join the two selected streams, and then join the result with the remaining streams
    const firstEntry: IJoinEntry = {
      output: getSafeBindings(await this.mediatorJoin
        .mediate({ type: action.type, entries: [ smallestEntry1, smallestEntry2 ], context: action.context })),
      operation: algebraFactory
        .createJoin([ smallestEntry1.operation, smallestEntry2.operation ], false),
    };
    entries.push(firstEntry);
    return {
      result: await this.mediatorJoin.mediate({
        type: action.type,
        entries,
        context: action.context,
      }),
    };
  }

  /**
   * Calculates the join cost coefficients for the multi-smallest join strategy.
   * @param action The join action to evaluate.
   * @param sideData Pre-computed side data including entry metadata.
   * @return A test result containing the estimated join coefficients and sorted entries.
   */
  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinMultiSmallestTestSideData>> {
    let { metadatas } = sideData;
    metadatas = [ ...metadatas ];
    // Determine the two smallest streams by sorting (e.g. via cardinality)
    const sortedEntries = await this.sortJoinEntries(action.entries
      .map((entry, i) => ({ ...entry, metadata: metadatas[i] })), action.context);
    metadatas = sortedEntries.map(entry => entry.metadata);
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);

    return passTestWithSideData({
      iterations: metadatas.reduce((acc, metadata) => acc * metadata.cardinality.value, 1),
      persistedItems: 0,
      blockingItems: 0,
      requestTime: metadatas.reduce((sum, metadata, i) => sum + requestInitialTimes[i] +
          metadata.cardinality.value * requestItemTimes[i], 0),
    }, { ...sideData, sortedEntries });
  }
}

export interface IActorRdfJoinMultiSmallestArgs extends IActorRdfJoinArgs<IActorRdfJoinMultiSmallestTestSideData> {
  /**
   * The join entries sort mediator
   */
  mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}

/**
 * Side data produced during the test phase of {@link ActorRdfJoinMultiSmallest}.
 */
export interface IActorRdfJoinMultiSmallestTestSideData extends IActorRdfJoinTestSideData {
  /** The join entries sorted by cardinality for use in the output phase. */
  sortedEntries: IJoinEntryWithMetadata[];
}
