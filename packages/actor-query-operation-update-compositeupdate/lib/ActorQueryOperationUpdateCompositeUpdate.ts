import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQueryableResult } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Update CompositeUpdate Query Operation Actor.
 */
export class ActorQueryOperationUpdateCompositeUpdate
  extends ActorQueryOperationTypedMediated<Algebra.CompositeUpdate> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'compositeupdate');
  }

  public async testOperation(
    operation: Algebra.CompositeUpdate,
    context: IActionContext,
  ): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public async runOperation(operationOriginal: Algebra.CompositeUpdate, context: IActionContext):
  Promise<IQueryableResult> {
    const updateResult = (async(): Promise<void> => {
      // Execute update operations in sequence
      for (const operation of operationOriginal.updates) {
        const subResult = ActorQueryOperation
          .getSafeUpdate(await this.mediatorQueryOperation.mediate({ operation, context }));
        await subResult.updateResult;
      }
    })();

    return {
      type: 'update',
      updateResult,
    };
  }
}
