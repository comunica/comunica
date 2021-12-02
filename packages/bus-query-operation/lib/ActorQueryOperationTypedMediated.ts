import type { Actor, IActorTest, Mediator } from '@comunica/core';
import type { IQueryableResult } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { IActionQueryOperation, IActorQueryOperationArgs, MediatorQueryOperation } from './ActorQueryOperation';
import { ActorQueryOperationTyped } from './ActorQueryOperationTyped';

/**
 * A base implementation for query operation actors for a specific operation type that have a query operation mediator.
 */
export abstract class ActorQueryOperationTypedMediated<O extends Algebra.Operation> extends ActorQueryOperationTyped<O>
  implements IActorQueryOperationTypedMediatedArgs {
  public readonly mediatorQueryOperation: MediatorQueryOperation;

  public constructor(args: IActorQueryOperationTypedMediatedArgs, operationName: string) {
    super(args, operationName);
  }
}

export interface IActorQueryOperationTypedMediatedArgs extends IActorQueryOperationArgs {
  mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IQueryableResult>,
  IActionQueryOperation, IActorTest, IQueryableResult>;
}
