import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';

/**
 * A comunica Rewrite Copy Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationRewriteCopy extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const factory = new AlgebraFactory(dataFactory);

    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.COPY]: {
        preVisitor: () => ({ continue: false }),
        transform: (operationOriginal) => {
        // No-op if source === destination
          if ((typeof operationOriginal.destination === 'string' && typeof operationOriginal.source === 'string' &&
          operationOriginal.destination === operationOriginal.source) ||
        (typeof operationOriginal.destination !== 'string' && typeof operationOriginal.source !== 'string' &&
          operationOriginal.destination.equals(operationOriginal.source))) {
            return factory.createCompositeUpdate([]);
          }
          // COPY is equivalent to drop destination, and add
          return factory.createCompositeUpdate([
            factory.createDrop(operationOriginal.destination, true),
            factory.createAdd(operationOriginal.source, operationOriginal.destination, operationOriginal.silent),
          ]);
        },
      },
    });

    return { operation, context: action.context };
  }
}
