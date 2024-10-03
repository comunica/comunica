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
import { Algebra, Factory, Util } from 'sparqlalgebrajs';

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
    const algebraFactory = new Factory(dataFactory);

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
    }, algebraFactory);

    return { operation, context: action.context };
  }
}
