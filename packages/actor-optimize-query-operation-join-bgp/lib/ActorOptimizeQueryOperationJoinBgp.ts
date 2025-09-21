import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import type { Algebra } from '@traqula/algebra-transformations-1-2';
import { algebraUtils, AlgebraFactory } from '@traqula/algebra-transformations-1-2';

/**
 * A comunica Join BGP Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationJoinBgp extends ActorOptimizeQueryOperation {
  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    const operation = algebraUtils.mapOperation(action.operation, {
      join(op: Algebra.Join, factory: AlgebraFactory) {
        if (op.input.every(subInput => subInput.type === 'bgp')) {
          return {
            recurse: false,
            result: factory.createBgp(op.input.flatMap(subInput => subInput.patterns)),
          };
        }
        return {
          recurse: false,
          result: op,
        };
      },
    }, algebraFactory);
    return { operation, context: action.context };
  }
}
