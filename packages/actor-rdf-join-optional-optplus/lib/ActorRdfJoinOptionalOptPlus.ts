import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  MediatorRdfJoin,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import {
  ActorRdfJoin,
} from '@comunica/bus-rdf-join';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
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
      metadata: async() => await this.constructResultMetadata(
        entries,
        await ActorRdfJoin.getMetadatas(entries),
        context,
        {},
        true,
      ),
    }};
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    return passTestWithSideData({
      iterations: sideData.metadatas[0].cardinality.value + sideData.metadatas[1].cardinality.value,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: 0,
    }, sideData);
  }
}

export interface IActorRdfJoinOptionalOptPlusJoinArgs extends IActorRdfJoinArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
