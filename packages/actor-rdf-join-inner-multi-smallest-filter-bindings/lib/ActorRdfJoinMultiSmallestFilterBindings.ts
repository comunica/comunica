import { bindingsToString } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  MediatorRdfJoin,
  IActorRdfJoinOutputInner,
} from '@comunica/bus-rdf-join';
import { ChunkedIterator, ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import { KeysInitQuery, KeysRdfJoin } from '@comunica/context-entries';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  BindingsStream,
  ComunicaDataFactory,
  IActionContext,
  IJoinEntry,
  IJoinEntryWithMetadata,
  IQuerySourceWrapper,
  MetadataBindings,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { UnionIterator } from 'asynciterator';
import { Factory } from 'sparqlalgebrajs';

/**
 * A comunica Inner Multi Smallest Filter Bindings RDF Join Actor.
 */
export class ActorRdfJoinMultiSmallestFilterBindings extends ActorRdfJoin {
  public readonly selectivityModifier: number;
  public readonly blockSize: number;
  public readonly mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorRdfJoinMultiSmallestFilterBindingsArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'multi-smallest-filter-bindings',
      limitEntries: 2,
      limitEntriesMin: true,
      isLeaf: false,
    });
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
  ): Promise<{ first: IJoinEntryWithMetadata; second: IJoinEntryWithMetadata; remaining: IJoinEntryWithMetadata[] }> {
    let { entries: entriesSorted } = await this.mediatorJoinEntriesSort.mediate({ entries, context });

    // Prioritize entries with modified operations, so these are not re-executed
    entriesSorted = entriesSorted.sort((entryLeft, entryRight) => {
      if (entryLeft.operationModified && !entryRight.operationModified) {
        return -1;
      }
      return 0;
    });

    const first = entriesSorted.splice(0, 1)[0];

    // Let second entry first be prioritized for sharing as many variables with first as possible,
    // then having the fewest variables,
    // and then having the lowest cardinality.
    let second: IJoinEntryWithMetadata | undefined;
    let secondIndex = -1;
    let secondSharedVariables = 0;
    for (const [ i, entry ] of entriesSorted.entries()) {
      const sharedVariables = first.metadata.variables
        .filter(variableFirst => entry.metadata.variables
          .some(variableSecond => variableFirst.equals(variableSecond))).length;
      if (!second || (sharedVariables > secondSharedVariables ||
        (sharedVariables === secondSharedVariables &&
          (entry.metadata.variables.length < second.metadata.variables.length ||
            (entry.metadata.variables.length === second.metadata.variables.length &&
              entry.metadata.cardinality.value < second.metadata.cardinality.value))))) {
        second = entry;
        secondIndex = i;
        secondSharedVariables = sharedVariables;
      }
    }

    if (secondSharedVariables === 0) {
      throw new Error(`Actor ${this.name} can only join with common variables`);
    }

    const remaining = entriesSorted;
    remaining.splice(secondIndex, 1);
    return { first, second: second!, remaining };
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);

    // Determine the two smallest streams by sorting (e.g. via cardinality)
    const entriesUnsorted = await ActorRdfJoin.getEntriesWithMetadatas([ ...action.entries ]);
    const { first, second: secondIn, remaining: remainingIn } = await this.sortJoinEntries(
      entriesUnsorted,
      action.context,
    );

    // Clone first stream, because we will use it twice
    const smallestStream1 = first.output.bindingsStream;
    first.output.bindingsStream = smallestStream1.clone();

    // Project the first stream on common variables, and filter out duplicates
    // The common variables array is guaranteed to be non-empty, due to the way the test of this actor is implemented.
    const commonVariables = first.metadata.variables
      .filter(variableFirst => secondIn.metadata.variables
        .some(variableSecond => variableFirst.equals(variableSecond)));
    const hashes: Record<string, boolean> = {};
    const smallestStream1Projected: BindingsStream = smallestStream1.clone()
      .map(binding => binding.filter((value, key) =>
        commonVariables.some(commonVariable => commonVariable.equals(key))))
      .filter((binding) => {
        const hash: string = bindingsToString(binding);
        return !(hash in hashes) && (hashes[hash] = true);
      });

    // Slice the first stream into chunks according to the block size, so we avoid blocking too long.
    const chunkedStreams: AsyncIterator<AsyncIterator<RDF.Bindings>> = new ChunkedIterator(
      smallestStream1Projected,
      this.blockSize,
      { autoStart: false },
    );

    // Push down bindings of first stream when querying for second stream
    const sourceWrapper: IQuerySourceWrapper = ActorQueryOperation.getOperationSource(secondIn.operation)!;
    const secondStream = new UnionIterator(chunkedStreams.map(chunk => sourceWrapper.source.queryBindings(
      secondIn.operation,
      sourceWrapper.context ? action.context.merge(sourceWrapper.context) : action.context,
      { filterBindings: { bindings: chunk, metadata: first.metadata }},
    )));
    const second: IJoinEntry = {
      output: {
        type: 'bindings',
        bindingsStream: secondStream,
        metadata: secondIn.output.metadata,
      },
      operation: secondIn.operation,
      operationModified: true,
    };

    // Destroy the unused original second stream
    secondIn.output.bindingsStream.destroy();

    // Join the two selected streams
    const joinedEntry: IJoinEntry = {
      output: ActorQueryOperation.getSafeBindings(await this.mediatorJoin
        .mediate({
          type: action.type,
          entries: [ first, second ],
          context: action.context.set(KeysRdfJoin.lastPhysicalJoin, this.physicalName),
        })),
      operation: algebraFactory.createJoin([ first.operation, second.operation ], false),
      operationModified: true,
    };

    // And then join the result with the remaining streams
    const remaining: IJoinEntry[] = remainingIn;
    remaining.unshift(joinedEntry);

    return {
      result: await this.mediatorJoin.mediate({
        type: action.type,
        entries: remaining,
        context: action.context,
      }),
      physicalPlanMetadata: {
        firstIndex: entriesUnsorted.indexOf(first),
        secondIndex: entriesUnsorted.indexOf(secondIn),
      },
    };
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    // Avoid infinite recursion
    if (action.context.get(KeysRdfJoin.lastPhysicalJoin) === this.physicalName) {
      throw new Error(`Actor ${this.name} can not be called recursively`);
    }

    metadatas = [ ...metadatas ];
    // Determine the two smallest streams by sorting (e.g. via cardinality)
    const { first, second, remaining } = await this.sortJoinEntries(action.entries
      .map((entry, i) => ({ ...entry, metadata: metadatas[i] })), action.context);

    // Only pass if the second entry accepts filterBindings
    const sourceWrapper: IQuerySourceWrapper | undefined = ActorQueryOperation.getOperationSource(second.operation);
    if (!sourceWrapper) {
      throw new Error(`Actor ${this.name} can only process if entries[1] has a source`);
    }
    const testingOperation = second.operation;
    const selectorShape = await sourceWrapper.source.getSelectorShape(action.context);
    if (!ActorQueryOperation
      .doesShapeAcceptOperation(selectorShape, testingOperation, { filterBindings: true })) {
      throw new Error(`Actor ${this.name} can only process if entries[1] accept filterBindings`);
    }

    // Determine cost coefficients
    metadatas = [ first.metadata, second.metadata, ...remaining.map(remain => remain.metadata) ];
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    const { selectivity } = await this.mediatorJoinSelectivity.mediate({
      entries: [ first, second ],
      context: action.context,
    });
    const cardinalityRemaining = remaining
      .reduce((mul, remain) => mul * remain.metadata.cardinality.value * this.selectivityModifier, 1);

    return {
      iterations: selectivity * this.selectivityModifier *
        second.metadata.cardinality.value * cardinalityRemaining,
      persistedItems: first.metadata.cardinality.value,
      blockingItems: first.metadata.cardinality.value,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + cardinalityRemaining * requestItemTimes[1],
    };
  }
}

export interface IActorRdfJoinMultiSmallestFilterBindingsArgs extends IActorRdfJoinArgs {
  /**
   * Multiplier for selectivity values
   * @range {double}
   * @default {0.0001}
   */
  selectivityModifier: number;
  /**
   * The maximum amount of bindings to send to the source per block.
   * @default {64}
   */
  blockSize: number;
  /**
   * The join entries sort mediator
   */
  mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
