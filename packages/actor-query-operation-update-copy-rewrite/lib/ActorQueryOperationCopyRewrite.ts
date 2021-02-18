import type { IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
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

  public async testOperation(pattern: Algebra.Copy, context: ActionContext): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public runOperation(pattern: Algebra.Copy, context: ActionContext): Promise<IActorQueryOperationOutput> {
    // No-op if source === destination
    if ((typeof pattern.destination === 'string' && typeof pattern.source === 'string' &&
      pattern.destination === pattern.source) ||
      (typeof pattern.destination !== 'string' && typeof pattern.source !== 'string' &&
        pattern.destination.equals(pattern.source))) {
      return Promise.resolve({
        type: 'update',
        updateResult: Promise.resolve(),
      });
    }

    // COPY is equivalent to drop destination, and add
    const operation = this.factory.createCompositeUpdate([
      this.factory.createDrop(pattern.destination, true),
      this.factory.createAdd(pattern.source, pattern.destination, pattern.silent),
    ]);
    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
