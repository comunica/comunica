import type { MediatorHashBindings } from '@comunica/bus-hash-bindings';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings } from '@comunica/types';
import { SymmetricHashJoin } from 'asyncjoin';

/**
 * A comunica Hash RDF Join Actor.
 */
export class ActorRdfJoinSymmetricHash extends ActorRdfJoin {
  public readonly mediatorHashBindings: MediatorHashBindings;

  public constructor(args: IActorRdfJoinSymmetricHashArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'symmetric-hash',
      limitEntries: 2,
      requiresVariableOverlap: true,
    });
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);
    const variables = ActorRdfJoin.overlappingVariables(metadatas);
    const { hashFunction } = await this.mediatorHashBindings.mediate({ context: action.context });
    const variablesRaw = variables.map(v => v.variable);
    const join = new SymmetricHashJoin<Bindings, number, Bindings>(
      action.entries[0].output.bindingsStream,
      action.entries[1].output.bindingsStream,
      entry => hashFunction(entry, variablesRaw),
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
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    const { metadatas } = sideData;
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    return passTestWithSideData({
      iterations: metadatas[0].cardinality.value + metadatas[1].cardinality.value,
      persistedItems: metadatas[0].cardinality.value + metadatas[1].cardinality.value,
      blockingItems: 0,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality.value * requestItemTimes[1],
    }, sideData);
  }
}

export interface IActorRdfJoinSymmetricHashArgs extends IActorRdfJoinArgs {
  /**
   * The mediator for hashing bindings.
   */
  mediatorHashBindings: MediatorHashBindings;
}
