import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IActionRdfJoin, IActorRdfJoinArgs, IActorRdfJoinOutputInner } from '@comunica/bus-rdf-join';
import { ActorRdfJoin, ChunkedIterator } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  IJoinEntryWithMetadata,
  IQueryOperationResultBindings,
  IQuerySourceWrapper,
  MetadataBindings,
  IActionContext,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { UnionIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

const AF = new Factory();

/**
 * A comunica Inner Multi Bind Source RDF Join Actor.
 */
export class ActorRdfJoinMultiBindSource extends ActorRdfJoin {
  public readonly selectivityModifier: number;
  public readonly blockSize: number;
  public readonly mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;

  public constructor(args: IActorRdfJoinInnerMultiBindSourceArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'bind-source',
      canHandleUndefs: true,
    });
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    // Order the entries so we can pick the first one (usually the one with the lowest cardinality)
    const entriesUnsorted = await ActorRdfJoin.getEntriesWithMetadatas(action.entries);
    const entries = await this.sortJoinEntries(entriesUnsorted, action.context);

    this.logDebug(
      action.context,
      'First entry for Bind Join Source: ',
      () => ({ entry: entries[0].operation, metadata: entries[0].metadata }),
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
    const sourceWrapper: IQuerySourceWrapper = ActorQueryOperation.getOperationSource(remainingEntries[0].operation)!;

    // Determine the operation to pass
    const operation = this.createOperationFromEntries(remainingEntries);

    // Slice the smallest stream into chunks according to the block size, so we avoid blocking too long.
    const chunkedStreams: AsyncIterator<AsyncIterator<RDF.Bindings>> = new ChunkedIterator(
      smallestStream.bindingsStream,
      this.blockSize,
      { autoStart: false },
    );

    // For each chunk, pass the query and the bindings to the source for execution
    const bindingsStream = new UnionIterator(chunkedStreams.transform({
      map: chunk => sourceWrapper.source.queryBindings(
        operation,
        sourceWrapper.context ? action.context.merge(sourceWrapper.context) : action.context,
        { joinBindings: { bindings: chunk, metadata: smallestMetadata }},
      ),
      autoStart: false,
    }));

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: () => this.constructResultMetadata(entries, entries.map(entry => entry.metadata), action.context),
      },
      physicalPlanMetadata: {
        bindIndex: entriesUnsorted.indexOf(entries[0]),
      },
    };
  }

  protected async sortJoinEntries(
    entries: IJoinEntryWithMetadata[],
    context: IActionContext,
  ): Promise<IJoinEntryWithMetadata[]> {
    entries = await ActorRdfJoin.sortJoinEntries(this.mediatorJoinEntriesSort, entries, context);

    // Prioritize entries with modified operations, so these are not re-executed
    entries = entries.sort((entryLeft, entryRight) => {
      if (entryLeft.operationModified && !entryRight.operationModified) {
        return -1;
      }
      return 0;
    });

    return entries;
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    // Order the entries so we can pick the first one (usually the one with the lowest cardinality)
    const entries = await this.sortJoinEntries(action.entries
      .map((entry, i) => ({ ...entry, metadata: metadatas[i] })), action.context);
    metadatas = entries.map(entry => entry.metadata);

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);

    // Determine first stream and remaining ones
    const remainingEntries = [ ...entries ];
    const remainingRequestInitialTimes = [ ...requestInitialTimes ];
    const remainingRequestItemTimes = [ ...requestItemTimes ];
    remainingEntries.splice(0, 1);
    remainingRequestInitialTimes.splice(0, 1);
    remainingRequestItemTimes.splice(0, 1);

    // Reject binding on operations without sources
    const sources = remainingEntries.map(entry => ActorQueryOperation.getOperationSource(entry.operation));
    if (sources.some(source => !source)) {
      throw new Error(`Actor ${this.name} can not bind on remaining operations without source annotation`);
    }

    // Reject binding on operations with un-equal sources
    if (sources.some(source => source !== sources[0])) {
      throw new Error(`Actor ${this.name} can not bind on remaining operations with non-equal source annotation`);
    }

    // Reject if the source can not handle bindings
    const sourceWrapper: IQuerySourceWrapper = sources[0]!;
    const testingOperation = this.createOperationFromEntries(remainingEntries);
    const selectorShape = await sourceWrapper.source.getSelectorShape(action.context);
    if (!ActorQueryOperation
      .doesShapeAcceptOperation(selectorShape, testingOperation, { joinBindings: true })) {
      throw new Error(`Actor ${this.name} detected a source that can not handle passing down join bindings`);
    }

    // Determine selectivities of smallest entry with all other entries
    const selectivities = await Promise.all(remainingEntries
      .map(async entry => (await this.mediatorJoinSelectivity.mediate({
        entries: [ entries[0], entry ],
        context: action.context,
      })).selectivity * this.selectivityModifier));

    // Determine coefficients for remaining entries
    const cardinalityRemaining = remainingEntries
      .map((entry, i) => entry.metadata.cardinality.value * selectivities[i])
      .reduce((sum, element) => sum + element, 0);

    return {
      iterations: 1,
      persistedItems: metadatas[0].cardinality.value,
      blockingItems: metadatas[0].cardinality.value,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + cardinalityRemaining * requestItemTimes[1],
    };
  }

  public createOperationFromEntries(remainingEntries: IJoinEntryWithMetadata[]): Algebra.Operation {
    if (remainingEntries.length === 1) {
      return remainingEntries[0].operation;
    }
    return AF.createJoin(remainingEntries.map(entry => entry.operation), true);
  }
}

export interface IActorRdfJoinInnerMultiBindSourceArgs extends IActorRdfJoinArgs {
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
