import type { IActionRdfJoin, IActorRdfJoinOutputInner, IActorRdfJoinArgs } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { MetadataBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';

/**
 * A comunica Multi Empty RDF Join Actor.
 */
export class ActorRdfJoinMultiEmpty extends ActorRdfJoin {
  public constructor(args: IActorRdfJoinArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'multi-empty',
    });
  }

  public async test(action: IActionRdfJoin): Promise<IMediatorTypeJoinCoefficients> {
    if ((await ActorRdfJoin.getMetadatas(action.entries))
      .every(metadata => ActorRdfJoin.getCardinality(metadata).value > 0)) {
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
        metadata: async() => ({
          cardinality: { type: 'exact', value: 0 },
          canContainUndefs: false,
          variables: ActorRdfJoin.joinVariables(await ActorRdfJoin.getMetadatas(action.entries)),
        }),
        type: 'bindings',
      },
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    return {
      iterations: 0,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: 0,
    };
  }
}
