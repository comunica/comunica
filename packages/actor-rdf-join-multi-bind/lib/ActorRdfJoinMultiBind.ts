import { ActorQueryOperation, getMetadata, materializeOperation } from '@comunica/bus-query-operation';
import type { IActionRdfJoin, IJoinEntry, IActorRdfJoinOutputInner } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import type {
  Bindings,
  BindingsStream, IActionQueryOperation,
  IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings,
} from '@comunica/types';
import { MultiTransformIterator, TransformIterator, UnionIterator } from 'asynciterator';
import { Factory, Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Multi-way Bind RDF Join Actor.
 */
export class ActorRdfJoinMultiBind extends ActorRdfJoin {
  public readonly bindOrder: BindOrder;
  public readonly mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
  IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;

  public static readonly FACTORY = new Factory();

  public constructor(args: IActorRdfJoinMultiBindArgs) {
    super(args, 'bind', undefined, undefined, true);
  }

  /**
   * Create a new bindings stream that takes every binding of the base stream
   * and binds it to the remaining patterns, evaluates those patterns, and emits all their bindings.
   *
   * @param bindOrder The order in which elements should be bound.
   * @param baseStream The base stream.
   * @param operations The operations to bind with each binding of the base stream.
   * @param operationBinder A callback to retrieve the bindings stream of bound operations.
   *
   * @return {BindingsStream}
   */
  public static createBindStream(
    bindOrder: BindOrder,
    baseStream: BindingsStream,
    operations: Algebra.Operation[],
    operationBinder: (boundOperations: Algebra.Operation[], operationBindings: Bindings)
    => Promise<BindingsStream>,
  ): BindingsStream {
    // Create bindings function
    const binder = (bindings: Bindings): BindingsStream => {
      // We don't bind the filter because filters are always handled last,
      // and we need to avoid binding filters of sub-queries, which are to be handled first. (see spec test bind10)
      const subOperations = operations
        .map(operation => materializeOperation(operation, bindings, { bindFilter: false }));
      const bindingsMerger = (subBindings: Bindings): Bindings => subBindings.merge(bindings);
      return new TransformIterator(async() => (await operationBinder(subOperations, bindings))
        .transform({ map: bindingsMerger }), { maxBufferSize: 128 });
    };

    // Create an iterator that binds elements from the base stream in different orders
    switch (bindOrder) {
      case 'depth-first':
        return new MultiTransformIterator(baseStream, { autoStart: false, multiTransform: binder });
      case 'breadth-first':
        return new UnionIterator(baseStream.map(binder), { autoStart: false });
      default:
        throw new Error(`Received request for unknown bind order: ${bindOrder}`);
    }
  }

  /**
   * Determine the entry with the lowest cardinality.
   * If there is a stream that can contain undefs, we don't modify the join order and just pick the first one.
   * @param entries Join entries
   */
  public static async getLeftEntryIndex(entries: IJoinEntry[]): Promise<number> {
    const canContainUndefs = entries.some(entry => entry.output.canContainUndefs);
    const metadatas = await ActorRdfJoin.getMetadatas(entries);
    return canContainUndefs ? 0 : ActorRdfJoin.getLowestCardinalityIndex(metadatas);
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    // Find the stream with lowest cardinality
    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);
    const smallestIndex: number = await ActorRdfJoinMultiBind.getLeftEntryIndex(action.entries);

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
    const smallestStream: IActorQueryOperationOutputBindings = action.entries.slice(smallestIndex)[0].output;
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
        const operation = ActorRdfJoinMultiBind.FACTORY.createJoin(operations);
        const output = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate(
          { operation, context: subContext?.set(KeysQueryOperation.joinBindings, operationBindings) },
        ));
        return output.bindingsStream;
      },
    );

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        variables: ActorRdfJoin.joinVariables(action),
        canContainUndefs: action.entries.some(entry => entry.output.canContainUndefs),
      },
      physicalPlanMetadata: {
        cardinalities: metadatas.map(ActorRdfJoin.getCardinality),
        bindIndex: smallestIndex,
        bindOrder: this.bindOrder,
      },
    };
  }

  public async getIterations(action: IActionRdfJoin): Promise<number> {
    // Find the stream with lowest cardinality
    const smallestIndex: number = await ActorRdfJoinMultiBind.getLeftEntryIndex(action.entries);

    // Take the stream with the lowest cardinality
    const remainingEntries: IJoinEntry[] = [ ...action.entries ];
    remainingEntries.splice(smallestIndex, 1);

    // Reject binding on some operation types
    if (remainingEntries
      .some(entry => entry.operation.type === Algebra.types.EXTEND || entry.operation.type === Algebra.types.GROUP)) {
      throw new Error(`Actor ${this.name} can not bind on Extend and Group operations`);
    }

    // Estimate join cardinality
    return ActorRdfJoin.getCardinality(await getMetadata(action.entries[smallestIndex].output)) *
      (await Promise.all(remainingEntries
        .map(async entry => ActorRdfJoin.getCardinality(await getMetadata(entry.output)))))
        .reduce((sum, element) => sum + element, 0);
  }
}

export interface IActorRdfJoinMultiBindArgs extends IActorArgs<IActionRdfJoin, IActorTest, IActorQueryOperationOutput> {
  mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
  IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  bindOrder: BindOrder;
}

export type BindOrder = 'depth-first' | 'breadth-first';
