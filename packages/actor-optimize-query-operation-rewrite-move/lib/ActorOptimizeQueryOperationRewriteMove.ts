import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { Algebra, Factory, Util } from 'sparqlalgebrajs';

/**
 * A comunica Rewrite Move Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationRewriteMove extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);

    const operation = Util.mapOperation(action.operation, {
      [Algebra.types.MOVE](operationOriginal, factory) {
        // No-op if source === destination
        let result: Algebra.CompositeUpdate;
        if ((typeof operationOriginal.destination === 'string' && typeof operationOriginal.source === 'string' &&
            operationOriginal.destination === operationOriginal.source) ||
          (typeof operationOriginal.destination !== 'string' && typeof operationOriginal.source !== 'string' &&
            operationOriginal.destination.equals(operationOriginal.source))) {
          result = factory.createCompositeUpdate([]);
        } else {
          // MOVE is equivalent to drop destination, add, and drop source
          const updates = [
            factory.createDrop(operationOriginal.destination, true),
            factory.createAdd(operationOriginal.source, operationOriginal.destination, operationOriginal.silent),
            factory.createDrop(operationOriginal.source),
          ];
          result = factory.createCompositeUpdate(updates);
        }

        return {
          result,
          recurse: false,
        };
      },
    }, algebraFactory);

    return { operation, context: action.context };
  }
}
