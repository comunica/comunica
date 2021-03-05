import {
  getMetadata,
} from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeIterations } from '@comunica/mediatortype-iterations';
import type { Bindings,
  IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings } from '@comunica/types';
import { NestedLoopJoin } from 'asyncjoin';

/**
 * A comunica NestedLoop RDF Join Actor.
 */
export class ActorRdfJoinNestedLoop extends ActorRdfJoin {
  public constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>) {
    super(args, 2, undefined, true);
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorQueryOperationOutputBindings> {
    const join = new NestedLoopJoin<Bindings, Bindings, Bindings>(
      action.entries[0].bindingsStream, action.entries[1].bindingsStream, <any> ActorRdfJoin.join, { autoStart: false },
    );
    return {
      type: 'bindings',
      bindingsStream: join,
      variables: ActorRdfJoin.joinVariables(action),
      canContainUndefs: action.entries.reduce((acc, val) => acc || val.canContainUndefs, false),
    };
  }

  protected async getIterations(action: IActionRdfJoin): Promise<number> {
    return (await getMetadata(action.entries[0])).totalItems * (await getMetadata(action.entries[1])).totalItems;
  }
}
