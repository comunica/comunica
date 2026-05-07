import type { Algebra } from '@comunica/utils-algebra';
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
  /**
   * The mediator for delegating sub-operations to other query operation actors.
   */
  public readonly mediatorQueryOperation: MediatorQueryOperation;

  public constructor(args: IActorQueryOperationTypedMediatedArgs<TS>, operationName: string) {
    super(args, operationName);
    this.mediatorQueryOperation = args.mediatorQueryOperation;
  }
}

/**
 * Constructor arguments for {@link ActorQueryOperationTypedMediated}.
 * @template TS The test side-data type.
 */
export interface IActorQueryOperationTypedMediatedArgs<TS = undefined> extends IActorQueryOperationArgs<TS> {
  /**
   * The mediator for delegating sub-operations to other query operation actors.
   */
  mediatorQueryOperation: MediatorQueryOperation;
}
