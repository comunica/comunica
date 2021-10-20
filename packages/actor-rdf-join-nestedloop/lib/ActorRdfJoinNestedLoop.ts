import type { IActionRdfJoin, IActorRdfJoinOutputInner, IMetadataChecked } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  Bindings,
  IActorQueryOperationOutputBindings,
} from '@comunica/types';
import { NestedLoopJoin } from 'asyncjoin';

/**
 * A comunica NestedLoop RDF Join Actor.
 */
export class ActorRdfJoinNestedLoop extends ActorRdfJoin {
  public constructor(
    args: IActorArgs<IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutputBindings>,
  ) {
    super(args, 'inner', 'nested-loop', 2, undefined, true);
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const join = new NestedLoopJoin<Bindings, Bindings, Bindings>(
      action.entries[0].output.bindingsStream,
      action.entries[1].output.bindingsStream,
      <any> ActorRdfJoin.joinBindings,
      { autoStart: false },
    );
    return {
      result: {
        type: 'bindings',
        bindingsStream: join,
        variables: ActorRdfJoin.joinVariables(action),
        canContainUndefs: action.entries.reduce((acc, val) => acc || val.output.canContainUndefs, false),
      },
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: IMetadataChecked[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    return {
      iterations: metadatas[0].cardinality * metadatas[1].cardinality,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality * requestItemTimes[1],
    };
  }
}
