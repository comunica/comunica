import {
  ActorQueryOperation,
} from '@comunica/bus-query-operation';
import type { IActionRdfJoin, IJoinEntry, IActorRdfJoinOutputInner, IMetadataChecked } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs, Mediator } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings } from '@comunica/types';
import { Factory } from 'sparqlalgebrajs';

/**
 * A Multi Smallest RDF Join Actor.
 * It accepts 3 or more streams, joins the smallest two, and joins the result with the remaining streams.
 */
export class ActorRdfJoinMultiSmallest extends ActorRdfJoin {
  public readonly mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput>;

  public static readonly FACTORY = new Factory();

  public constructor(args: IActorRdfJoinMultiSmallestArgs) {
    super(args, 'multi-smallest', 3, true);
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const entries: IJoinEntry[] = action.entries.slice();

    // Determine the two smallest streams by estimated count
    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);
    const smallestIndex1: number = ActorRdfJoin.getLowestCardinalityIndex(metadatas);
    const smallestItem1 = entries.splice(smallestIndex1, 1)[0];
    metadatas.splice(smallestIndex1, 1);
    const smallestIndex2: number = ActorRdfJoin.getLowestCardinalityIndex(metadatas);
    const smallestItem2 = entries.splice(smallestIndex2, 1)[0];
    metadatas.splice(smallestIndex2, 1);

    // Join the two selected streams, and then join the result with the remaining streams
    const firstEntry: IJoinEntry = {
      output: ActorQueryOperation.getSafeBindings(await this.mediatorJoin
        .mediate({ entries: [ smallestItem1, smallestItem2 ], context: action.context })),
      operation: ActorRdfJoinMultiSmallest.FACTORY
        .createJoin([ smallestItem1.operation, smallestItem2.operation ], false),
    };
    entries.push(firstEntry);
    return {
      result: <IActorQueryOperationOutputBindings> await this.mediatorJoin.mediate({
        entries,
        context: action.context,
      }),
      physicalPlanMetadata: {
        smallest: [ smallestIndex1, smallestIndex2 ],
      },
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: IMetadataChecked[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    metadatas = [ ...metadatas ];
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);

    // Determine the two smallest streams by estimated count
    const smallestIndex1: number = ActorRdfJoin.getLowestCardinalityIndex(metadatas);
    const metadataSmallest1 = metadatas.splice(smallestIndex1, 1)[0];
    const requestInitialTimeSmallest1 = requestInitialTimes.splice(smallestIndex1, 1)[0];
    const requestItemTimesSmallest1 = requestItemTimes.splice(smallestIndex1, 1)[0];
    const smallestIndex2: number = ActorRdfJoin.getLowestCardinalityIndex(metadatas);
    const metadataSmallest2 = metadatas.splice(smallestIndex2, 1)[0];
    const requestInitialTimeSmallest2 = requestInitialTimes.splice(smallestIndex2, 1)[0];
    const requestItemTimesSmallest2 = requestItemTimes.splice(smallestIndex2, 1)[0];

    return {
      iterations: metadataSmallest1.cardinality * metadataSmallest2.cardinality *
        metadatas.reduce((acc, metadata) => acc * metadata.cardinality, 1),
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimeSmallest1 + metadataSmallest1.cardinality * requestItemTimesSmallest1 +
        requestInitialTimeSmallest2 + metadataSmallest2.cardinality * requestItemTimesSmallest2 +
        metadatas
          .reduce((sum, metadata, i) => sum + requestInitialTimes[i] + metadata.cardinality * requestItemTimes[i], 0),
    };
  }
}

export interface IActorRdfJoinMultiSmallestArgs
  extends IActorArgs<IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput> {
  mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput>;
}
