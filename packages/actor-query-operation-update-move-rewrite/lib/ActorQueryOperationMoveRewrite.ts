import type { IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
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

  public async testOperation(pattern: Algebra.Move, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public runOperation(pattern: Algebra.Move, context: ActionContext): Promise<IActorQueryOperationOutput> {
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

    // MOVE is equivalent to drop destination, add, and drop source
    const updates = [
      this.factory.createDrop(pattern.destination, true),
      this.factory.createAdd(pattern.source, pattern.destination, pattern.silent),
      this.factory.createDrop(pattern.source),
    ];
    const operation = this.factory.createCompositeUpdate(updates);
    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
