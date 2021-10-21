import {
  ActorQueryOperation,
} from '@comunica/bus-query-operation';
import type { IActionRdfJoin, IJoinEntry, IActorRdfJoinOutputInner,
  IMetadataChecked, IActorRdfJoinArgs } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { Mediator } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IActorQueryOperationOutput, IActorQueryOperationOutputBindings } from '@comunica/types';
import { Factory } from 'sparqlalgebrajs';

/**
 * A Multi Sequential RDF Join Actor.
 * It accepts 3 or more streams, joins the first two, and joins the result with the remaining streams.
 */
export class ActorRdfJoinMultiSequential extends ActorRdfJoin {
  public readonly mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput>;

  public static readonly FACTORY = new Factory();

  public constructor(args: IActorRdfJoinMultiSequentialArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'multi-sequential',
      limitEntries: 3,
      limitEntriesMin: true,
    });
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    // Join the two first streams, and then join the result with the remaining streams
    const firstEntry: IJoinEntry = {
      output: ActorQueryOperation.getSafeBindings(await this.mediatorJoin
        .mediate({ type: action.type, entries: [ action.entries[0], action.entries[1] ], context: action.context })),
      operation: ActorRdfJoinMultiSequential.FACTORY
        .createJoin([ action.entries[0].operation, action.entries[1].operation ], false),
    };
    const remainingEntries: IJoinEntry[] = action.entries.slice(1);
    remainingEntries[0] = firstEntry;
    return {
      result: <IActorQueryOperationOutputBindings> await this.mediatorJoin.mediate({
        type: action.type,
        entries: remainingEntries,
        context: action.context,
      }),
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: IMetadataChecked[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    return {
      iterations: metadatas[0].cardinality * metadatas[1].cardinality *
        metadatas.slice(2).reduce((acc, metadata) => acc * metadata.cardinality, 1),
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality * requestItemTimes[1] +
        metadatas.slice(2)
          .reduce((sum, metadata, i) => sum + requestInitialTimes[i] + metadata.cardinality * requestItemTimes[i], 0),
    };
  }
}

export interface IActorRdfJoinMultiSequentialArgs extends IActorRdfJoinArgs {
  mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutputBindings>;
}
