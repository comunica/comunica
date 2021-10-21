import type { IActionRdfJoin, IActorRdfJoinOutputInner, IActorRdfJoinArgs } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';

/**
 * A comunica Single RDF Join Actor.
 */
export class ActorRdfJoinSingle extends ActorRdfJoin {
  public constructor(args: IActorRdfJoinArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'single',
      limitEntries: 1,
    });
    this.includeInLogs = false;
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
