import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { IActorTest } from '@comunica/core';
import { Algebra, Util } from 'sparqlalgebrajs';

/**
 * A comunica Rewrite Copy Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationRewriteCopy extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const operation = Util.mapOperation(action.operation, {
      [Algebra.types.COPY](operationOriginal, factory) {
        // No-op if source === destination
        let result: Algebra.CompositeUpdate;
        if ((typeof operationOriginal.destination === 'string' && typeof operationOriginal.source === 'string' &&
            operationOriginal.destination === operationOriginal.source) ||
          (typeof operationOriginal.destination !== 'string' && typeof operationOriginal.source !== 'string' &&
            operationOriginal.destination.equals(operationOriginal.source))) {
          result = factory.createCompositeUpdate([]);
        } else {
          // COPY is equivalent to drop destination, and add
          result = factory.createCompositeUpdate([
            factory.createDrop(operationOriginal.destination, true),
            factory.createAdd(operationOriginal.source, operationOriginal.destination, operationOriginal.silent),
          ]);
        }

        return {
          result,
          recurse: false,
        };
      },
    });

    return { operation, context: action.context };
  }
}
