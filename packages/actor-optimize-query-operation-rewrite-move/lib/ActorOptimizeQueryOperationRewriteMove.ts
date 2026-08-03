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
 * A comunica Rewrite Move Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationRewriteMove extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const factory = new AlgebraFactory(dataFactory);

    const operation = algebraUtils.mapOperation(
      action.operation,
      { [Algebra.Types.MOVE]: {
        preVisitor: () => ({ continue: false }),
        transform: (operationOriginal) => {
        // No-op if source === destination
          if ((typeof operationOriginal.destination === 'string' && typeof operationOriginal.source === 'string' &&
                  operationOriginal.destination === operationOriginal.source) ||
                (typeof operationOriginal.destination !== 'string' && typeof operationOriginal.source !== 'string' &&
                  operationOriginal.destination.equals(operationOriginal.source))) {
            return factory.createCompositeUpdate([]);
          }
          // MOVE is equivalent to drop destination, add, and drop source
          const updates = [
            factory.createDrop(operationOriginal.destination, true),
            factory.createAdd(operationOriginal.source, operationOriginal.destination, operationOriginal.silent),
            factory.createDrop(operationOriginal.source),
          ];
          return factory.createCompositeUpdate(updates);
        },
      }},
    );

    return { operation, context: action.context };
  }
}
