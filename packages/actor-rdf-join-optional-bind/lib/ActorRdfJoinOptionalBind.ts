import type { BindOrder } from '@comunica/actor-rdf-join-inner-multi-bind';
import { ActorRdfJoinMultiBind } from '@comunica/actor-rdf-join-inner-multi-bind';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData, failTest } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, BindingsStream, ComunicaDataFactory } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { Algebra, Factory } from 'sparqlalgebrajs';

/**
 * A comunica Optional Bind RDF Join Actor.
 */
export class ActorRdfJoinOptionalBind extends ActorRdfJoin {
  public readonly bindOrder: BindOrder;
  public readonly selectivityModifier: number;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorRdfJoinOptionalBindArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: 'bind',
      limitEntries: 2,
      canHandleUndefs: true,
      isLeaf: false,
      requiresVariableOverlap: true,
    });
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);
    const bindingsFactory = await BindingsFactory.create(
      this.mediatorMergeBindingsContext,
      action.context,
      dataFactory,
    );
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
        const output = getSafeBindings(await this.mediatorQueryOperation.mediate(
          { operation, context: subContext?.set(KeysQueryOperation.joinBindings, operationBindings) },
        ));
        return output.bindingsStream;
      },
      true,
      algebraFactory,
      bindingsFactory,
    );

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: async() => await this.constructResultMetadata(
          action.entries,
          await ActorRdfJoin.getMetadatas(action.entries),
          action.context,
          {},
          true,
        ),
      },
    };
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    const { metadatas } = sideData;

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);

    // Reject binding on some operation types
    if (action.entries[1].operation.type === Algebra.types.EXTEND ||
      action.entries[1].operation.type === Algebra.types.GROUP) {
      return failTest(`Actor ${this.name} can not bind on Extend and Group operations`);
    }

    // Determine selectivity of join
    const selectivity = (await this.mediatorJoinSelectivity.mediate({
      entries: action.entries,
      context: action.context,
    })).selectivity * this.selectivityModifier;

    return passTestWithSideData({
      iterations: metadatas[0].cardinality.value * metadatas[1].cardinality.value * selectivity,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimes[0] +
        metadatas[0].cardinality.value * (
          requestItemTimes[0] +
          requestInitialTimes[1] +
          selectivity * metadatas[1].cardinality.value * requestItemTimes[1]
        ),
    }, sideData);
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
   * @default {0.000001}
   */
  selectivityModifier: number;
  /**
   * The query operation mediator
   */
  mediatorQueryOperation: MediatorQueryOperation;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;

}
