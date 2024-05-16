import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperation, materializeOperation } from '@comunica/bus-query-operation';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, BindingsStream, IQueryOperationResultBindings, MetadataBindings } from '@comunica/types';
import { MultiTransformIterator, TransformIterator, UnionIterator } from 'asynciterator';
import { Factory, Algebra, Util } from 'sparqlalgebrajs';

/**
 * A comunica Multi-way Bind RDF Join Actor.
 */
export class ActorRdfJoinMultiBind extends ActorRdfJoin {
  public readonly bindOrder: BindOrder;
  public readonly selectivityModifier: number;
  public readonly mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public static readonly FACTORY = new Factory();

  public constructor(args: IActorRdfJoinMultiBindArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'bind',
      canHandleUndefs: true,
    });
  }

  /**
   * Create a new bindings stream that takes every binding of the base stream
   * and binds it to the remaining patterns, evaluates those patterns, and emits all their bindings.
   *
   * @param bindOrder The order in which elements should be bound.
   * @param baseStream The base stream.
   * @param operations The operations to bind with each binding of the base stream.
   * @param operationBinder A callback to retrieve the bindings stream of bound operations.
   * @param optional If the original bindings should be emitted when the resulting bindings stream is empty.
   * @return {BindingsStream}
   */
  public static createBindStream(
    bindOrder: BindOrder,
    baseStream: BindingsStream,
    operations: Algebra.Operation[],
    operationBinder: (boundOperations: Algebra.Operation[], operationBindings: Bindings)
    => Promise<BindingsStream>,
    optional: boolean,
    bindingsFactory: BindingsFactory,
  ): BindingsStream {
    // Create bindings function
    const binder = (bindings: Bindings): BindingsStream => {
      // We don't bind the filter because filters are always handled last,
      // and we need to avoid binding filters of sub-queries, which are to be handled first. (see spec test bind10)
      const subOperations = operations
        .map(operation => materializeOperation(operation, bindings, bindingsFactory, { bindFilter: true }));
      const bindingsMerger = (subBindings: Bindings): Bindings | undefined => subBindings.merge(bindings);
      return new TransformIterator(async() => (await operationBinder(subOperations, bindings))
        .transform({ map: bindingsMerger }), { maxBufferSize: 128, autoStart: false });
    };

    // Create an iterator that binds elements from the base stream in different orders
    switch (bindOrder) {
      case 'depth-first':
        return new MultiTransformIterator(baseStream, { autoStart: false, multiTransform: binder, optional });
      case 'breadth-first':
        return new UnionIterator(baseStream.transform({
          map: binder,
          optional,
        }), { autoStart: false });
      default:
        // eslint-disable-next-line ts/restrict-template-expressions
        throw new Error(`Received request for unknown bind order: ${bindOrder}`);
    }
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context);

    // Order the entries so we can pick the first one (usually the one with the lowest cardinality)
    const entriesUnsorted = await ActorRdfJoin.getEntriesWithMetadatas(action.entries);
    const entries = await ActorRdfJoin.sortJoinEntries(this.mediatorJoinEntriesSort, entriesUnsorted, action.context);

    this.logDebug(
      action.context,
      'First entry for Bind Join: ',
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
    const remainingEntries = [ ...entries ];
    remainingEntries.splice(0, 1);

    // Bind the remaining patterns for each binding in the stream
    const subContext = action.context
      .set(KeysQueryOperation.joinLeftMetadata, entries[0].metadata)
      .set(KeysQueryOperation.joinRightMetadatas, remainingEntries.map(entry => entry.metadata));
    const bindingsStream: BindingsStream = ActorRdfJoinMultiBind.createBindStream(
      this.bindOrder,
      smallestStream.bindingsStream,
      remainingEntries.map(entry => entry.operation),
      async(operations: Algebra.Operation[], operationBindings: Bindings) => {
        // Send the materialized patterns to the mediator for recursive join evaluation.
        const operation = operations.length === 1 ?
          operations[0] :
          ActorRdfJoinMultiBind.FACTORY.createJoin(operations);
        const output = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate(
          { operation, context: subContext?.set(KeysQueryOperation.joinBindings, operationBindings) },
        ));
        return output.bindingsStream;
      },
      false,
      bindingsFactory,
    );

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: () => this.constructResultMetadata(entries, entries.map(entry => entry.metadata), action.context),
      },
      physicalPlanMetadata: {
        bindIndex: entriesUnsorted.indexOf(entries[0]),
        bindOrder: this.bindOrder,
      },
    };
  }

  public canBindWithOperation(operation: Algebra.Operation): boolean {
    let valid = true;
    Util.recurseOperation(operation, {
      [Algebra.types.EXTEND](): boolean {
        valid = false;
        return false;
      },
      [Algebra.types.GROUP](): boolean {
        valid = false;
        return false;
      },
      // [Algebr
    });

    return valid;
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    // Order the entries so we can pick the first one (usually the one with the lowest cardinality)
    const entries = await ActorRdfJoin.sortJoinEntries(this.mediatorJoinEntriesSort, action.entries
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

    // Reject binding on some operation types
    if (remainingEntries
      .some(entry => !this.canBindWithOperation(entry.operation))) {
      throw new Error(`Actor ${this.name} can not bind on Extend and Group operations`);
    }

    // Reject binding on modified operations, since using the output directly would be significantly more efficient.
    if (remainingEntries.some(entry => entry.operationModified)) {
      throw new Error(`Actor ${this.name} can not be used over remaining entries with modified operations`);
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
    const receiveInitialCostRemaining = remainingRequestInitialTimes
      .reduce((sum, element) => sum + element, 0);
    const receiveItemCostRemaining = remainingRequestItemTimes
      .reduce((sum, element) => sum + element, 0);

    return {
      iterations: metadatas[0].cardinality.value * cardinalityRemaining,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimes[0] +
        metadatas[0].cardinality.value * (
          requestItemTimes[0] +
          receiveInitialCostRemaining +
          cardinalityRemaining * receiveItemCostRemaining
        ),
    };
  }
}

export interface IActorRdfJoinMultiBindArgs extends IActorRdfJoinArgs {
  /**
   * The order in which elements should be bound
   * @default {depth-first}
   */
  bindOrder: BindOrder;
  /**
   * Multiplier for selectivity values
   * @range {double}
   * @default {0.0001}
   */
  selectivityModifier: number;
  /**
   * The join entries sort mediator
   */
  mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
  /**
   * The query operation mediator
   */
  mediatorQueryOperation: MediatorQueryOperation;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}

export type BindOrder = 'depth-first' | 'breadth-first';
