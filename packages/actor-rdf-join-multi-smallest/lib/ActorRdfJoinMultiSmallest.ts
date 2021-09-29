import {
  ActorQueryOperation,
  getMetadata,
} from '@comunica/bus-query-operation';
import type { IActionRdfJoin, IJoinEntry } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs, IActorTest, Mediator } from '@comunica/core';
import type { IMediatorTypeIterations } from '@comunica/mediatortype-iterations';
import type { IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings } from '@comunica/types';
import { Factory } from 'sparqlalgebrajs';

/**
 * A Multi Smallest RDF Join Actor.
 * It accepts 3 or more streams, joins the smallest two, and joins the result with the remaining streams.
 */
export class ActorRdfJoinMultiSmallest extends ActorRdfJoin {
  public readonly mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;

  public static readonly FACTORY = new Factory();

  public constructor(args: IActorRdfJoinMultiSmallestArgs) {
    super(args, 3, true);
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorQueryOperationOutputBindings> {
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
        .createJoin([ smallestItem1.operation, smallestItem2.operation ]),
    };
    entries.push(firstEntry);
    return <IActorQueryOperationOutputBindings> await this.mediatorJoin.mediate({
      entries,
      context: action.context,
    });
  }

  protected async getIterations(action: IActionRdfJoin): Promise<number> {
    return (await Promise.all(action.entries.map(entry => getMetadata(entry.output))))
      .reduce((acc, value) => acc * value.totalItems, 1);
  }
}

export interface IActorRdfJoinMultiSmallestArgs
  extends IActorArgs<IActionRdfJoin, IActorTest, IActorQueryOperationOutput> {
  mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;
}
