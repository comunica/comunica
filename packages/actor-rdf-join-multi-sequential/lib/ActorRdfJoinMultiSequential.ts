import {
  ActorQueryOperation,
  getMetadata,
} from '@comunica/bus-query-operation';
import type { IActionRdfJoin, IJoinEntry, IActorRdfJoinOutputInner } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs, IActorTest, Mediator } from '@comunica/core';
import type { IMediatorTypeIterations } from '@comunica/mediatortype-iterations';
import type { IActorQueryOperationOutput, IActorQueryOperationOutputBindings } from '@comunica/types';
import { Factory } from 'sparqlalgebrajs';

/**
 * A Multi Sequential RDF Join Actor.
 * It accepts 3 or more streams, joins the first two, and joins the result with the remaining streams.
 */
export class ActorRdfJoinMultiSequential extends ActorRdfJoin {
  public readonly mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;

  public static readonly FACTORY = new Factory();

  public constructor(args: IActorRdfJoinMultiSequentialArgs) {
    super(args, 'multi-sequential', 3, true);
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    // Join the two first streams, and then join the result with the remaining streams
    const firstEntry: IJoinEntry = {
      output: ActorQueryOperation.getSafeBindings(await this.mediatorJoin
        .mediate({ entries: [ action.entries[0], action.entries[1] ], context: action.context })),
      operation: ActorRdfJoinMultiSequential.FACTORY
        .createJoin([ action.entries[0].operation, action.entries[1].operation ]),
    };
    const remainingEntries: IJoinEntry[] = action.entries.slice(1);
    remainingEntries[0] = firstEntry;
    return {
      result: <IActorQueryOperationOutputBindings> await this.mediatorJoin.mediate({
        entries: remainingEntries,
        context: action.context,
      }),
    };
  }

  protected async getIterations(action: IActionRdfJoin): Promise<number> {
    // TODO: improve and use join-card bus
    return (await Promise.all(action.entries.map(entry => getMetadata(entry.output))))
      .reduce((acc, value) => acc * value.cardinality, 1);
  }
}

export interface IActorRdfJoinMultiSequentialArgs
  extends IActorArgs<IActionRdfJoin, IActorTest, IActorQueryOperationOutput> {
  mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>;
}
