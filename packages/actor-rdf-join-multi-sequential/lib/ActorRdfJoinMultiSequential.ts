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
 * A Multi Sequential RDF Join Actor.
 * It accepts 3 or more streams, joins the first two, and joins the result with the remaining streams.
 */
export class ActorRdfJoinMultiSequential extends ActorRdfJoin {
  public readonly mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;

  public constructor(args: IActorRdfJoinMultiSequentialArgs) {
    super(args, 3, true);
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorQueryOperationOutputBindings> {
    // Join the two first streams, and then join the result with the remaining streams
    const firstEntry: IActorQueryOperationOutputBindings = <IActorQueryOperationOutputBindings> await
    this.mediatorJoin.mediate({ entries: [ action.entries[0], action.entries[1] ]});
    const remainingEntries: IActorQueryOperationOutputBindings[] = action.entries.slice(1);
    remainingEntries[0] = firstEntry;
    return <IActorQueryOperationOutputBindings> await this.mediatorJoin.mediate({ entries: remainingEntries });
  }

  protected async getIterations(action: IActionRdfJoin): Promise<number> {
    return (await Promise.all(action.entries.map(x => getMetadata(x))))
      .reduce((acc, value) => acc * value.totalItems, 1);
  }
}

export interface IActorRdfJoinMultiSequentialArgs
  extends IActorArgs<IActionRdfJoin, IActorTest, IActorQueryOperationOutput> {
  mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;
}
