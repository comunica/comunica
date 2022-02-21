import type { IActorTest, IBusArgs } from '@comunica/core';
import { BusIndexed } from '@comunica/core';
import type { IQueryOperationResult } from '@comunica/types';
import type { ActorQueryOperation, IActionQueryOperation } from './ActorQueryOperation';

/**
 * Indexed bus for query operations.
 */
export class BusQueryOperation
  extends BusIndexed<ActorQueryOperation, IActionQueryOperation, IActorTest, IQueryOperationResult> {
  public constructor(args: IBusArgs) {
    super({
      ...args,
      actorIdentifierFields: [ 'operationName' ],
      actionIdentifierFields: [ 'operation', 'type' ],
    });
  }
}
