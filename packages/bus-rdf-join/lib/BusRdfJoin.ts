import type { IActorTest, IBusArgs } from '@comunica/core';
import { BusIndexed } from '@comunica/core';
import type { IQueryOperationResultBindings } from '@comunica/types';
import type { ActorRdfJoin, IActionRdfJoin } from './ActorRdfJoin';

/**
 * Indexed bus for RDF joins, which only tests the actors for the logical join type of an action.
 */
export class BusRdfJoin extends BusIndexed<ActorRdfJoin, IActionRdfJoin, IActorTest, IQueryOperationResultBindings> {
  public constructor(args: IBusArgs) {
    super({
      ...args,
      actorIdentifierFields: [ 'logicalType' ],
      actionIdentifierFields: [ 'type' ],
    });
  }
}
