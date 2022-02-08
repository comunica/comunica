import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that
 * handles SPARQL move operations.
 */
export class ActorQueryOperationMoveRewrite extends ActorQueryOperationTypedMediated<Algebra.Move> {
  private readonly factory: Factory;

  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'move');
    this.factory = new Factory();
  }

  public async testOperation(operation: Algebra.Move, context: IActionContext): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public runOperation(operationOriginal: Algebra.Move, context: IActionContext): Promise<IQueryOperationResult> {
    // No-op if source === destination
    if ((typeof operationOriginal.destination === 'string' && typeof operationOriginal.source === 'string' &&
        operationOriginal.destination === operationOriginal.source) ||
      (typeof operationOriginal.destination !== 'string' && typeof operationOriginal.source !== 'string' &&
        operationOriginal.destination.equals(operationOriginal.source))) {
      return Promise.resolve({
        type: 'void',
        execute: () => Promise.resolve(),
      });
    }

    // MOVE is equivalent to drop destination, add, and drop source
    const updates = [
      this.factory.createDrop(operationOriginal.destination, true),
      this.factory.createAdd(operationOriginal.source, operationOriginal.destination, operationOriginal.silent),
      this.factory.createDrop(operationOriginal.source),
    ];
    const operation = this.factory.createCompositeUpdate(updates);
    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
