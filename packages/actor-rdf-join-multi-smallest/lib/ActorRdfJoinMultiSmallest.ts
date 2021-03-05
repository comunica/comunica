import {
  getMetadata,
} from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs, IActorTest, Mediator } from '@comunica/core';
import type { IMediatorTypeIterations } from '@comunica/mediatortype-iterations';
import type { IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings } from '@comunica/types';

/**
 * A Multi Smallest RDF Join Actor.
 * It accepts 3 or more streams, joins the smallest two, and joins the result with the remaining streams.
 */
export class ActorRdfJoinMultiSmallest extends ActorRdfJoin {
  public readonly mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;

  public constructor(args: IActorRdfJoinMultiSmallestArgs) {
    super(args, 3, true);
  }

  public static getSmallestPatternId(totalItems: number[]): number {
    let smallestId = -1;
    let smallestCount = Number.POSITIVE_INFINITY;
    for (const [ i, count ] of totalItems.entries()) {
      if (count <= smallestCount) {
        smallestCount = count;
        smallestId = i;
      }
    }
    return smallestId;
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorQueryOperationOutputBindings> {
    const entries: IActorQueryOperationOutputBindings[] = action.entries.slice();

    // Determine the two smallest streams by estimated count
    const entriesTotalItems = (await Promise.all(action.entries.map(x => getMetadata(x))))
      .map(metadata => 'totalItems' in metadata ? metadata.totalItems : Number.POSITIVE_INFINITY);
    const smallestIndex1: number = ActorRdfJoinMultiSmallest.getSmallestPatternId(entriesTotalItems);
    const smallestItem1 = entries.splice(smallestIndex1, 1)[0];
    const smallestCount1 = entriesTotalItems.splice(smallestIndex1, 1);
    const smallestIndex2: number = ActorRdfJoinMultiSmallest.getSmallestPatternId(entriesTotalItems);
    const smallestItem2 = entries.splice(smallestIndex2, 1)[0];
    const smallestCount2 = entriesTotalItems.splice(smallestIndex2, 1);

    // Join the two selected streams, and then join the result with the remaining streams
    const firstEntry: IActorQueryOperationOutputBindings = <IActorQueryOperationOutputBindings> await
    this.mediatorJoin.mediate({ entries: [ smallestItem1, smallestItem2 ]});
    entries.push(firstEntry);
    return <IActorQueryOperationOutputBindings> await this.mediatorJoin.mediate({ entries });
  }

  protected async getIterations(action: IActionRdfJoin): Promise<number> {
    return (await Promise.all(action.entries.map(x => getMetadata(x))))
      .reduce((acc, value) => acc * value.totalItems, 1);
  }
}

export interface IActorRdfJoinMultiSmallestArgs
  extends IActorArgs<IActionRdfJoin, IActorTest, IActorQueryOperationOutput> {
  mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;
}
