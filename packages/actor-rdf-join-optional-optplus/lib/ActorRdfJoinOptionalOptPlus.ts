import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  MediatorRdfJoin,
} from '@comunica/bus-rdf-join';
import {
  ActorRdfJoin,
} from '@comunica/bus-rdf-join';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { MetadataBindings } from '@comunica/types';
import { UnionIterator } from 'asynciterator';

/**
 * A comunica Optional Opt+ RDF Join Actor.
 */
export class ActorRdfJoinOptionalOptPlus extends ActorRdfJoin {
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorRdfJoinOptionalOptPlusJoinArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: 'nested-loop',
      limitEntries: 2,
      canHandleUndefs: true,
    });
  }

  public async getOutput({ entries, context }: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const clonedStream = entries[0].output.bindingsStream.clone();
    entries[0].output.bindingsStream = entries[0].output.bindingsStream.clone();
    const joined = await this.mediatorJoin.mediate({ type: 'inner', entries, context });
    return { result: {
      type: 'bindings',
      bindingsStream: new UnionIterator([ clonedStream, joined.bindingsStream ], { autoStart: false }),
      metadata: async(): Promise<MetadataBindings> => {
        const [ leftMeta, joinedMeta ] = await Promise.all([ entries[0].output.metadata(), joined.metadata() ]);
        return {
          variables: joinedMeta.variables,
          canContainUndefs: true,
          cardinality: {
            type: joinedMeta.cardinality.type,
            value: leftMeta.cardinality.value + joinedMeta.cardinality.value,
          },
          state: this.constructState([ leftMeta, joinedMeta ]),
        };
      },
    }};
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

export interface IActorRdfJoinOptionalOptPlusJoinArgs extends IActorRdfJoinArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
