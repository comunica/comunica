import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { IActorTest, TestResult } from '@comunica/core';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import { getSafeVoid, testReadOnly } from '@comunica/utils-query-operation';
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
  ): Promise<TestResult<IActorTest>> {
    return testReadOnly(context);
  }

  public async runOperation(operationOriginal: Algebra.CompositeUpdate, context: IActionContext):
  Promise<IQueryOperationResult> {
    const execute = (): Promise<void> => (async(): Promise<void> => {
      // Execute update operations in sequence
      for (const operation of operationOriginal.updates) {
        const subResult = getSafeVoid(await this.mediatorQueryOperation.mediate({ operation, context }));
        await subResult.execute();
      }
    })();

    return {
      type: 'void',
      execute,
    };
  }
}
