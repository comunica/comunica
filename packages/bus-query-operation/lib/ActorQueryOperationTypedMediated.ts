import type { Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import type { IActionQueryOperation, IActorQueryOperationOutput } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import { ActorQueryOperationTyped } from './ActorQueryOperationTyped';

/**
 * A base implementation for query operation actors for a specific operation type that have a query operation mediator.
 */
export abstract class ActorQueryOperationTypedMediated<O extends Algebra.Operation> extends ActorQueryOperationTyped<O>
  implements IActorQueryOperationTypedMediatedArgs {
  public readonly mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
  IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;

  public constructor(args: IActorQueryOperationTypedMediatedArgs, operationName: string) {
    super(args, operationName);
  }
}

export interface IActorQueryOperationTypedMediatedArgs
  extends IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput> {
  mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
  IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
}
