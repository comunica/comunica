import type { IActionRdfJoin, IActorRdfJoinOutputInner, IMetadataChecked } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';

/**
 * A comunica Multi Empty RDF Join Actor.
 */
export class ActorRdfJoinMultiEmpty extends ActorRdfJoin {
  public constructor(
    args: IActorArgs<IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutputBindings>,
  ) {
    super(args, 'inner', 'multi-empty');
  }

  public async test(action: IActionRdfJoin): Promise<IMediatorTypeJoinCoefficients> {
    if ((await ActorRdfJoin.getMetadatas(action.entries))
      .every(metadata => ActorRdfJoin.getCardinality(metadata) > 0)) {
      throw new Error(`Actor ${this.name} can only join entries where at least one is empty`);
    }
    return super.test(action);
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    // Close all entries
    for (const entry of action.entries) {
      entry.output.bindingsStream.close();
    }

    return {
      result: {
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 0 }),
        type: 'bindings',
        variables: ActorRdfJoin.joinVariables(action),
        canContainUndefs: false,
      },
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: IMetadataChecked[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    return {
      iterations: 0,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: 0,
    };
  }
}
