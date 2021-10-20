import type { IActorQueryOperationOutputBindings } from '@comunica/bus-query-operation';
import { Bindings } from '@comunica/bus-query-operation';
import type { IActionRdfJoin, IActorRdfJoinOutputInner } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import { ArrayIterator } from 'asynciterator';

/**
 * A comunica None RDF Join Actor.
 */
export class ActorRdfJoinNone extends ActorRdfJoin {
  public constructor(
    args: IActorArgs<IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutputBindings>,
  ) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'none',
      limitEntries: 0,
    });
  }

  public async test(action: IActionRdfJoin): Promise<IMediatorTypeJoinCoefficients> {
    // Allow joining of one or zero streams
    if (action.entries.length > 0) {
      throw new Error(`Actor ${this.name} can only join zero entries`);
    }
    return await this.getJoinCoefficients();
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    return {
      result: {
        bindingsStream: new ArrayIterator([ Bindings({}) ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 1 }),
        type: 'bindings',
        variables: [],
        canContainUndefs: false,
      },
    };
  }

  protected async getJoinCoefficients(): Promise<IMediatorTypeJoinCoefficients> {
    return {
      iterations: 0,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: 0,
    };
  }
}
