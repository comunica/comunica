import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { IActorTest, TestResult } from '@comunica/core';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { getSafeVoid, runInTransaction, testReadOnly } from '@comunica/utils-query-operation';

/**
 * A comunica Update CompositeUpdate Query Operation Actor.
 */
export class ActorQueryOperationUpdateCompositeUpdate
  extends ActorQueryOperationTypedMediated<Algebra.CompositeUpdate> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.Types.COMPOSITE_UPDATE);
  }

  public async testOperation(
    operation: Algebra.CompositeUpdate,
    context: IActionContext,
  ): Promise<TestResult<IActorTest>> {
    return testReadOnly(context);
  }

  public async runOperation(operationOriginal: Algebra.CompositeUpdate, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Execute update operations in sequence, within one transaction,
    // so that their changes only take effect once all of them succeed
    const execute = (): Promise<void> => runInTransaction(context, async(transactionContext) => {
      for (const operation of operationOriginal.updates) {
        const subResult = getSafeVoid(await this.mediatorQueryOperation
          .mediate({ operation, context: transactionContext }));
        await subResult.execute();
      }
    });

    return {
      type: 'void',
      execute,
    };
  }
}
