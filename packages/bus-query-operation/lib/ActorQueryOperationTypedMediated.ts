import type { Algebra } from '@traqula/algebra-transformations-1-2';
import type { IActorQueryOperationArgs, MediatorQueryOperation } from './ActorQueryOperation';
import { ActorQueryOperationTyped } from './ActorQueryOperationTyped';

/**
 * A base implementation for query operation actors for a specific operation type that have a query operation mediator.
 */
export abstract class ActorQueryOperationTypedMediated<
  O extends Algebra.Operation,
TS = undefined,
> extends ActorQueryOperationTyped<O, TS>
  implements IActorQueryOperationTypedMediatedArgs<TS> {
  public readonly mediatorQueryOperation: MediatorQueryOperation;

  public constructor(args: IActorQueryOperationTypedMediatedArgs<TS>, operationName: string) {
    super(args, operationName);
  }
}

export interface IActorQueryOperationTypedMediatedArgs<TS = undefined> extends IActorQueryOperationArgs<TS> {
  mediatorQueryOperation: MediatorQueryOperation;
}
