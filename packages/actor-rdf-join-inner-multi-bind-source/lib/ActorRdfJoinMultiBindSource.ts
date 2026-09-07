import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  IActorRdfJoinOutputInner,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData, failTest, passTest } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  BindingsStream,
  IJoinEntryWithMetadata,
  IQueryOperationResultBindings,
  IQuerySourceWrapper,
  IActionContext,
  ComunicaDataFactory,
  MetadataBindings,
} from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type { Algebra } from '@comunica/utils-algebra';
import { ChunkedIterator } from '@comunica/utils-iterator';
import { doesShapeAcceptOperation, getOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { UnionIterator } from 'asynciterator';

/**
 * A comunica Inner Multi Bind Source RDF Join Actor.
 */
export class ActorRdfJoinMultiBindSource extends ActorRdfJoin<IActorRdfJoinMultiBindSourceTestSideData> {
  public readonly selectivityModifier: number;
  public readonly blockSize: number;
  public readonly mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;

  public constructor(args: IActorRdfJoinInnerMultiBindSourceArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'bind-source',
      canHandleUndefs: true,
    });
    this.selectivityModifier = args.selectivityModifier;
    this.blockSize = args.blockSize;
    this.mediatorJoinEntriesSort = args.mediatorJoinEntriesSort;
  }

  /**
   * Order the entries of a chained bind so every step after the first is a lookup rather than a scan.
   *
   * Repeatedly takes the cheapest entry that shares a variable with what is already bound. Ordering by cardinality
   * alone lets an unrelated pattern in, and that step then becomes a full scan for every single binding.
   */
  public static orderChain(
    entries: IJoinEntryWithMetadata[],
    seed: MetadataBindings,
  ): IJoinEntryWithMetadata[] {
    const pending = [ ...entries ];
    const bound = new Set(seed.variables.map(({ variable }) => variable.value));
    const ordered: IJoinEntryWithMetadata[] = [];
    while (pending.length > 0) {
      let best = 0;
      for (let i = 1; i < pending.length; i++) {
        const connected = pending[i].metadata.variables.some(({ variable }) => bound.has(variable.value));
        const bestConnected = pending[best].metadata.variables.some(({ variable }) => bound.has(variable.value));
        const smaller = pending[i].metadata.cardinality.value < pending[best].metadata.cardinality.value;
        if (connected === bestConnected ? smaller : connected) {
          best = i;
        }
      }
      const [ chosen ] = pending.splice(best, 1);
      for (const { variable } of chosen.metadata.variables) {
        bound.add(variable.value);
      }
      ordered.push(chosen);
    }
    return ordered;
  }

  public async getOutput(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinMultiBindSourceTestSideData,
  ): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // Order the entries so we can pick the first one (usually the one with the lowest cardinality)
    const entries = sideData.entriesSorted;
    this.logDebug(
      action.context,
      'First entry for Bind Join Source: ',
      () => ({
        entry: entries[0].operation,
        cardinality: entries[0].metadata.cardinality,
        order: entries[0].metadata.order,
        availableOrders: entries[0].metadata.availableOrders,
      }),
    );

    // Close the non-smallest streams
    for (const [ i, element ] of entries.entries()) {
      if (i !== 0) {
        element.output.bindingsStream.close();
      }
    }

    // Take the stream with the lowest cardinality
    const smallestStream: IQueryOperationResultBindings = entries[0].output;
    const smallestMetadata = entries[0].metadata;
    const remainingEntries = [ ...entries ];
    remainingEntries.splice(0, 1);

    // Get source for remaining entries (guaranteed thanks to prior check in getJoinCoefficients())
    const sourceWrapper = <IQuerySourceWrapper> getOperationSource(remainingEntries[0].operation);

    // Determine the operation to pass
    const operation = this.createOperationFromEntries(algebraFactory, remainingEntries);

    // Slice the smallest stream into chunks according to the block size, so we avoid blocking too long.
    const chunkedStreams: AsyncIterator<AsyncIterator<RDF.Bindings>> = new ChunkedIterator(
      smallestStream.bindingsStream,
      this.blockSize,
      { autoStart: false },
    );

    const subContext = sourceWrapper.context ? action.context.merge(sourceWrapper.context) : action.context;
    // When the source will not take the remaining entries as one operation, fold the bindings through them one at a
    // time. Each step is still a single call into the source, so the engine is never re-entered per binding, which
    // is the entire cost an in-engine bind join would otherwise pay.
    const chainOrder = sideData.chained ?
      ActorRdfJoinMultiBindSource.orderChain(remainingEntries, smallestMetadata) :
      undefined;
    const bindingsStream: BindingsStream = new UnionIterator<RDF.Bindings>(chunkedStreams.map((chunk) => {
      if (!chainOrder) {
        return sourceWrapper.source.queryBindings(operation, subContext, {
          joinBindings: { bindings: chunk, metadata: smallestMetadata },
        });
      }
      let stream: BindingsStream = chunk;
      for (const entry of chainOrder) {
        stream = sourceWrapper.source.queryBindings(entry.operation, subContext, {
          joinBindings: { bindings: stream, metadata: smallestMetadata },
        });
      }
      return stream;
    }), { autoStart: false });

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: () => this.constructResultMetadata(entries, entries.map(entry => entry.metadata), action.context),
      },
      physicalPlanMetadata: {
        bindIndex: sideData.entriesUnsorted.indexOf(entries[0]),
      },
    };
  }

  protected async sortJoinEntries(
    entries: IJoinEntryWithMetadata[],
    context: IActionContext,
  ): Promise<TestResult<IJoinEntryWithMetadata[]>> {
    const entriesTest = await ActorRdfJoin.sortJoinEntries(this.mediatorJoinEntriesSort, entries, context);
    if (entriesTest.isFailed()) {
      return entriesTest;
    }
    entries = entriesTest.get();

    // Prioritize entries with modified operations, so these are not re-executed
    entries = entries.sort((entryLeft, entryRight) => {
      if (entryLeft.operationModified && !entryRight.operationModified) {
        return -1;
      }
      return 0;
    });

    return passTest(entries);
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinMultiBindSourceTestSideData>> {
    let { metadatas } = sideData;

    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // Order the entries so we can pick the first one (usually the one with the lowest cardinality)
    const entriesUnsorted = action.entries.map((entry, i) => ({ ...entry, metadata: metadatas[i] }));
    const entriesTest = await this.sortJoinEntries(entriesUnsorted, action.context);
    if (entriesTest.isFailed()) {
      return entriesTest;
    }
    const entriesSorted = entriesTest.get();
    metadatas = entriesSorted.map(entry => entry.metadata);

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);

    // Determine first stream and remaining ones
    const remainingEntries = [ ...entriesSorted ];
    const remainingRequestInitialTimes = [ ...requestInitialTimes ];
    const remainingRequestItemTimes = [ ...requestItemTimes ];
    remainingEntries.splice(0, 1);
    remainingRequestInitialTimes.splice(0, 1);
    remainingRequestItemTimes.splice(0, 1);

    // Reject binding on operations without sources
    const sources = remainingEntries.map(entry => getOperationSource(entry.operation));
    if (sources.some(source => !source)) {
      return failTest(`Actor ${this.name} can not bind on remaining operations without source annotation`);
    }

    // Reject binding on operations with un-equal sources
    if (sources.some(source => source !== sources[0])) {
      return failTest(`Actor ${this.name} can not bind on remaining operations with non-equal source annotation`);
    }

    // Reject if the source can not handle bindings
    const sourceWrapper: IQuerySourceWrapper = <IQuerySourceWrapper> sources[0];
    const testingOperation = this.createOperationFromEntries(algebraFactory, remainingEntries);
    const selectorShape = await sourceWrapper.source.getSelectorShape(action.context);
    const wildcardAcceptAllExtensionFunctions = action.context.get(KeysInitQuery.extensionFunctionsAlwaysPushdown);
    const acceptsWhole = doesShapeAcceptOperation(selectorShape, testingOperation, {
      joinBindings: true,
      wildcardAcceptAllExtensionFunctions,
    });
    // A source that only takes one pattern at a time can still answer all of them, one after the other
    const chained = !acceptsWhole && remainingEntries.every(entry => doesShapeAcceptOperation(
      selectorShape,
      entry.operation,
      { joinBindings: true, wildcardAcceptAllExtensionFunctions },
    ));
    if (!acceptsWhole && !chained) {
      return failTest(`Actor ${this.name} detected a source that can not handle passing down join bindings`);
    }

    // Determine selectivities of smallest entry with all other entries
    const selectivities = await Promise.all(remainingEntries
      .map(async entry => (await this.mediatorJoinSelectivity.mediate({
        entries: [ entriesSorted[0], entry ],
        context: action.context,
      })).selectivity * this.selectivityModifier));

    // Determine coefficients for remaining entries
    const cardinalityRemaining = remainingEntries
      .map((entry, i) => entry.metadata.cardinality.value * selectivities[i])
      .reduce((sum, element) => sum + element, 0);

    return passTestWithSideData({
      iterations: 1,
      persistedItems: metadatas[0].cardinality.value,
      blockingItems: metadatas[0].cardinality.value,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + cardinalityRemaining * requestItemTimes[1],
    }, { ...sideData, entriesUnsorted, entriesSorted, chained });
  }

  public createOperationFromEntries(
    algebraFactory: AlgebraFactory,
    remainingEntries: IJoinEntryWithMetadata[],
  ): Algebra.Operation {
    if (remainingEntries.length === 1) {
      return remainingEntries[0].operation;
    }
    return algebraFactory.createJoin(remainingEntries.map(entry => entry.operation), true);
  }
}

export interface IActorRdfJoinInnerMultiBindSourceArgs
  extends IActorRdfJoinArgs<IActorRdfJoinMultiBindSourceTestSideData> {
  /**
   * Multiplier for selectivity values
   * @range {double}
   * @default {0.0001}
   */
  selectivityModifier: number;
  /**
   * The maximum amount of bindings to send to the source per block.
   * @default {16}
   */
  blockSize: number;
  /**
   * The join entries sort mediator
   */
  mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
}

export interface IActorRdfJoinMultiBindSourceTestSideData extends IActorRdfJoinTestSideData {
  entriesUnsorted: IJoinEntryWithMetadata[];
  entriesSorted: IJoinEntryWithMetadata[];
  /**
   * Whether the remaining entries must be sent to the source one at a time rather than as one operation.
   */
  chained: boolean;
}
