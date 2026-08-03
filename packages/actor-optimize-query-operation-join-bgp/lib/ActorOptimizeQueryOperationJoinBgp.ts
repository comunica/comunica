import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';

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
      [Algebra.Types.JOIN]: {
        preVisitor: () => ({ continue: false }),
        transform: (op) => {
          if (op.input.every(subInput => subInput.type === 'bgp')) {
            return algebraFactory.createBgp(op.input.flatMap(subInput => (<Algebra.Bgp> subInput).patterns));
          }
          return op;
        },
      },
    });
    return { operation, context: action.context };
  }
}
