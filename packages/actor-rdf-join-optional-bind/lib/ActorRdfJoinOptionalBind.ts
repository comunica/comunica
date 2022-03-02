import type { BindOrder } from '@comunica/actor-rdf-join-inner-multi-bind';
import { ActorRdfJoinMultiBind } from '@comunica/actor-rdf-join-inner-multi-bind';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IActionRdfJoin, IActorRdfJoinOutputInner, IActorRdfJoinArgs } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, BindingsStream, MetadataBindings } from '@comunica/types';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Optional Bind RDF Join Actor.
 */
export class ActorRdfJoinOptionalBind extends ActorRdfJoin {
  public readonly bindOrder: BindOrder;
  public readonly selectivityModifier: number;
  public readonly mediatorQueryOperation: MediatorQueryOperation;

  public constructor(args: IActorRdfJoinOptionalBindArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: 'bind',
      limitEntries: 2,
      canHandleUndefs: true,
    });
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    // Close the right stream, since we don't need that one
    action.entries[1].output.bindingsStream.close();

    // Bind the right pattern for each binding in the stream
    const subContext = action.context
      .set(KeysQueryOperation.joinLeftMetadata, await action.entries[0].output.metadata())
      .set(KeysQueryOperation.joinRightMetadatas, [ await action.entries[1].output.metadata() ]);
    const bindingsStream: BindingsStream = ActorRdfJoinMultiBind.createBindStream(
      this.bindOrder,
      action.entries[0].output.bindingsStream,
      [ action.entries[1].operation ],
      async(operations: Algebra.Operation[], operationBindings: Bindings) => {
        // Send the materialized patterns to the mediator for recursive join evaluation.
        // Length of operations will always be 1
        const operation = operations[0];
        const output = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate(
          { operation, context: subContext?.set(KeysQueryOperation.joinBindings, operationBindings) },
        ));
        return output.bindingsStream;
      },
      true,
    );

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: async() => await this.constructResultMetadata(
          action.entries,
          await ActorRdfJoin.getMetadatas(action.entries),
          action.context,
          { canContainUndefs: true },
        ),
      },
    };
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);

    // Reject binding on some operation types
    if (action.entries[1].operation.type === Algebra.types.EXTEND ||
      action.entries[1].operation.type === Algebra.types.GROUP) {
      throw new Error(`Actor ${this.name} can not bind on Extend and Group operations`);
    }

    // Determine selectivity of join
    const selectivity = (await this.mediatorJoinSelectivity.mediate({
      entries: action.entries,
      context: action.context,
    })).selectivity * this.selectivityModifier;

    return {
      iterations: metadatas[0].cardinality.value * metadatas[1].cardinality.value * selectivity,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimes[0] +
        metadatas[0].cardinality.value * selectivity * (
          requestItemTimes[0] +
          requestInitialTimes[1] +
          metadatas[1].cardinality.value * requestItemTimes[1]
        ),
    };
  }
}

export interface IActorRdfJoinOptionalBindArgs extends IActorRdfJoinArgs {
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
