import type { IActionRdfJoin, IActorRdfJoinOutputInner, IActorRdfJoinArgs } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, MetadataBindings } from '@comunica/types';
import { HashJoin } from 'asyncjoin';

/**
 * A comunica Hash RDF Join Actor.
 */
export class ActorRdfJoinHash extends ActorRdfJoin {
  public constructor(args: IActorRdfJoinArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'hash',
      limitEntries: 2,
      requiresVariableOverlap: true,
    });
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    let metadatas = await ActorRdfJoin.getMetadatas(action.entries);

    // Ensure the left build stream is the smallest
    // TODO: in the next major version, use ActorRdfJoin.sortJoinEntries, which requires mediatorJoinEntriesSort
    if (metadatas[1].cardinality.value < metadatas[0].cardinality.value) {
      metadatas = [ metadatas[1], metadatas[0] ];
      action = { ...action, entries: [ action.entries[1], action.entries[0] ]};
    }

    const variables = ActorRdfJoin.overlappingVariables(metadatas);
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
        metadata: async() => await this.constructResultMetadata(action.entries, metadatas, action.context),
      },
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    // Ensure the left build stream is the smallest
    if (metadatas[1].cardinality.value < metadatas[0].cardinality.value) {
      metadatas = [ metadatas[1], metadatas[0] ];
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    return {
      iterations: metadatas[0].cardinality.value + metadatas[1].cardinality.value,
      persistedItems: metadatas[0].cardinality.value,
      blockingItems: metadatas[0].cardinality.value,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality.value * requestItemTimes[1],
    };
  }
}
