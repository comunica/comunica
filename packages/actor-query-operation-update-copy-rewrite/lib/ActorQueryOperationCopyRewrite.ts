import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that
 * handles SPARQL copy operations.
 */
export class ActorQueryOperationCopyRewrite extends ActorQueryOperationTypedMediated<Algebra.Copy> {
  private readonly factory: Factory;

  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'copy');
    this.factory = new Factory();
  }

  public async testOperation(operation: Algebra.Copy, context: IActionContext): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public runOperation(operationOriginal: Algebra.Copy, context: IActionContext): Promise<IQueryOperationResult> {
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

    // COPY is equivalent to drop destination, and add
    const operation = this.factory.createCompositeUpdate([
      this.factory.createDrop(operationOriginal.destination, true),
      this.factory.createAdd(operationOriginal.source, operationOriginal.destination, operationOriginal.silent),
    ]);
    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
