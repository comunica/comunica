import type { IActionRdfJoin, IActorRdfJoinOutputInner } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IActorQueryOperationOutput } from '@comunica/types';

/**
 * A comunica Single RDF Join Actor.
 */
export class ActorRdfJoinSingle extends ActorRdfJoin {
  public constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput>) {
    super(args, 'single', 1);
  }

  public async test(action: IActionRdfJoin): Promise<IMediatorTypeJoinCoefficients> {
    // Allow joining of one or zero streams
    if (action.entries.length !== 1) {
      throw new Error(`Actor ${this.name} can only join a single entry`);
    }
    return await this.getJoinCoefficients();
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    return {
      result: action.entries[0].output,
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
