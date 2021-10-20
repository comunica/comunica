import type { IActionRdfJoin, IActorRdfJoinOutputInner, IMetadataChecked } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  Bindings, IActorQueryOperationOutputBindings,
} from '@comunica/types';
import { HashJoin } from 'asyncjoin';

/**
 * A comunica Hash RDF Join Actor.
 */
export class ActorRdfJoinHash extends ActorRdfJoin {
  public constructor(
    args: IActorArgs<IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutputBindings>,
  ) {
    super(args, 'inner', 'hash', 2);
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const variables = ActorRdfJoin.overlappingVariables(action);
    const join = new HashJoin<Bindings, string, Bindings>(
      action.entries[0].output.bindingsStream,
      action.entries[1].output.bindingsStream,
      entry => ActorRdfJoin.hash(entry, variables),
      <any> ActorRdfJoin.joinBindings,
    );
    return {
      result: {
        type: 'bindings',
        bindingsStream: join,
        variables: ActorRdfJoin.joinVariables(action),
        canContainUndefs: false,
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
      iterations: metadatas[0].cardinality + metadatas[1].cardinality,
      persistedItems: metadatas[0].cardinality,
      blockingItems: metadatas[0].cardinality,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality * requestItemTimes[1],
    };
  }
}
