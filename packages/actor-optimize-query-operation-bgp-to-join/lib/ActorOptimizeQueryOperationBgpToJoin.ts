import { AlgebraFactory, algebraUtils } from '@comunica/algebra-sparql-comunica';
import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';

/**
 * A comunica BGP to Join Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationBgpToJoin extends ActorOptimizeQueryOperation {
  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    const operation = algebraUtils.mapOperation(action.operation, {
      bgp(bgpOp, factory) {
        return {
          recurse: false,
          result: factory.createJoin(bgpOp.patterns),
        };
      },
    }, algebraFactory);
    return { operation, context: action.context };
  }
}
