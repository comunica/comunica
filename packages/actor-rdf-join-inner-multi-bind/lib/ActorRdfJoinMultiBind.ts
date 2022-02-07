import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperation, materializeOperation } from '@comunica/bus-query-operation';
import type {
  IActionRdfJoin,
  IJoinEntry,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, BindingsStream, IQueryOperationResultBindings, MetadataBindings } from '@comunica/types';
import { MultiTransformIterator, TransformIterator, UnionIterator } from 'asynciterator';
import { Factory, Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Multi-way Bind RDF Join Actor.
 */
export class ActorRdfJoinMultiBind extends ActorRdfJoin {
  public readonly bindOrder: BindOrder;
  public readonly selectivityModifier: number;
  public readonly mediatorQueryOperation: MediatorQueryOperation;

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
  ): BindingsStream {
    // Create bindings function
    const binder = (bindings: Bindings): BindingsStream => {
      // We don't bind the filter because filters are always handled last,
      // and we need to avoid binding filters of sub-queries, which are to be handled first. (see spec test bind10)
      const subOperations = operations
        .map(operation => materializeOperation(operation, bindings, { bindFilter: false }));
      const bindingsMerger = (subBindings: Bindings): Bindings | undefined => subBindings.merge(bindings);
      return new TransformIterator(async() => (await operationBinder(subOperations, bindings))
        .transform({ map: bindingsMerger }), { maxBufferSize: 128 });
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
        throw new Error(`Received request for unknown bind order: ${bindOrder}`);
    }
  }

  /**
   * Determine the entry with the lowest cardinality.
   * @param entries Join entries
   * @param metadatas Resolved metadata objects.
   */
  public static async getLeftEntryIndex(entries: IJoinEntry[], metadatas: MetadataBindings[]): Promise<number> {
    // If there is a stream that can contain undefs, we don't modify the join order and just pick the first one.
    const canContainUndefs = metadatas.some(metadata => metadata.canContainUndefs);
    if (canContainUndefs) {
      return 0;
    }

    // Calculate number of occurrences of each variable
    const variableOccurrences: Record<string, number> = {};
    for (const metadata of metadatas) {
      for (const variable of metadata.variables) {
        let counter = variableOccurrences[variable.value];
        if (!counter) {
          counter = 0;
        }
        variableOccurrences[variable.value] = ++counter;
      }
    }

    // Determine variables that occur in at least two join entries
    const multiOccurrenceVariables: string[] = [];
    for (const [ variable, count ] of Object.entries(variableOccurrences)) {
      if (count >= 2) {
        multiOccurrenceVariables.push(variable);
      }
    }

    // Reject if no entries have common variables
    if (multiOccurrenceVariables.length === 0) {
      throw new Error(`Bind join can only join entries with at least one common variable`);
    }

    // Determine indexes of entries without common variables
    // These will be blacklisted from lowest cardinality determination
    const indexesWithoutCommonVariables: number[] = [];
    for (const [ i, metadata ] of metadatas.entries()) {
      let hasCommon = false;
      for (const variable of metadata.variables) {
        if (multiOccurrenceVariables.includes(variable.value)) {
          hasCommon = true;
          break;
        }
      }
      if (!hasCommon) {
        indexesWithoutCommonVariables.push(i);
      }
    }

    return ActorRdfJoin.getLowestCardinalityIndex(metadatas, indexesWithoutCommonVariables);
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    // Find the stream with lowest cardinality
    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);
    const smallestIndex: number = await ActorRdfJoinMultiBind.getLeftEntryIndex(action.entries, metadatas);

    this.logDebug(action.context,
      'First entry for Bind Join: ',
      () => ({ entry: action.entries[smallestIndex].operation, metadata: metadatas[smallestIndex] }));

    // Close the non-smallest streams
    for (const [ i, element ] of action.entries.entries()) {
      if (i !== smallestIndex) {
        element.output.bindingsStream.close();
      }
    }

    // Take the stream with the lowest cardinality
    const smallestStream: IQueryOperationResultBindings = action.entries.slice(smallestIndex)[0].output;
    const remainingEntries = [ ...action.entries ];
    remainingEntries.splice(smallestIndex, 1);
    const remainingMetadatas: Record<string, any>[] = [ ...metadatas ];
    remainingMetadatas.splice(smallestIndex, 1);

    // Bind the remaining patterns for each binding in the stream
    const subContext = action.context && action.context
      .set(KeysQueryOperation.joinLeftMetadata, metadatas[smallestIndex])
      .set(KeysQueryOperation.joinRightMetadatas, remainingMetadatas);
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
    );

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: () => this.constructResultMetadata(action.entries, metadatas, action.context),
      },
      physicalPlanMetadata: {
        bindIndex: smallestIndex,
        bindOrder: this.bindOrder,
      },
    };
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);

    // Find the stream with lowest cardinality
    const smallestIndex: number = await ActorRdfJoinMultiBind.getLeftEntryIndex(action.entries, metadatas);

    // Take the stream with the lowest cardinality
    const remainingEntries: IJoinEntry[] = [ ...action.entries ];
    const remainingMetadatas: MetadataBindings[] = [ ...metadatas ];
    const remainingRequestInitialTimes = [ ...requestInitialTimes ];
    const remainingRequestItemTimes = [ ...requestItemTimes ];
    remainingEntries.splice(smallestIndex, 1);
    remainingMetadatas.splice(smallestIndex, 1);
    remainingRequestInitialTimes.splice(smallestIndex, 1);
    remainingRequestItemTimes.splice(smallestIndex, 1);

    // Reject binding on some operation types
    if (remainingEntries
      .some(entry => entry.operation.type === Algebra.types.EXTEND || entry.operation.type === Algebra.types.GROUP)) {
      throw new Error(`Actor ${this.name} can not bind on Extend and Group operations`);
    }

    // Determine selectivities of smallest entry with all other entries
    const selectivities = await Promise.all(remainingEntries
      .map(async entry => (await this.mediatorJoinSelectivity.mediate({
        entries: [
          action.entries[smallestIndex],
          entry,
        ],
        context: action.context,
      })).selectivity * this.selectivityModifier));

    // Determine coefficients for remaining entries
    const cardinalityRemaining = remainingMetadatas
      .map((metadata, i) => metadata.cardinality.value * selectivities[i])
      .reduce((sum, element) => sum + element, 0);
    const receiveInitialCostRemaining = remainingRequestInitialTimes
      .reduce((sum, element, i) => sum + (element * selectivities[i]), 0);
    const receiveItemCostRemaining = remainingRequestItemTimes
      .reduce((sum, element, i) => sum + (element * selectivities[i]), 0);

    return {
      iterations: metadatas[smallestIndex].cardinality.value * cardinalityRemaining,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimes[smallestIndex] +
        metadatas[smallestIndex].cardinality.value * (
          requestItemTimes[smallestIndex] +
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
   * The query operation mediator
   */
  mediatorQueryOperation: MediatorQueryOperation;
}

export type BindOrder = 'depth-first' | 'breadth-first';
