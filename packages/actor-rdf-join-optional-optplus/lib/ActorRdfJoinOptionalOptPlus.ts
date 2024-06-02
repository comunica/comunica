import type { IActionRdfJoin, IActorRdfJoinOutputInner, IActorRdfJoinArgs, MediatorRdfJoin } from '@comunica/bus-rdf-join';
import {
  ActorRdfJoin,
} from '@comunica/bus-rdf-join';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { MetadataBindings } from '@comunica/types';
import { UnionIterator } from 'asynciterator';

/**
 * A comunica Optional Nested Loop RDF Join Actor.
 */
export class ActorRdfJoinOptionalNestedLoop extends ActorRdfJoin {
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorRdfJoinArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: 'nested-loop',
      limitEntries: 2,
      canHandleUndefs: true,
    });
  }

  public async getOutput({ entries, context }: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const stream = entries[0].output.bindingsStream;
    entries[0].output.bindingsStream = stream.clone();
    const joined = await this.mediatorJoin.mediate({ type: 'inner', entries, context });
    joined.bindingsStream = new UnionIterator([ stream.clone(), joined.bindingsStream ], { autoStart: false });
    return { result: joined };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    return {
      iterations: metadatas[0].cardinality.value + metadatas[1].cardinality.value,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: 0,
    };
  }
}
