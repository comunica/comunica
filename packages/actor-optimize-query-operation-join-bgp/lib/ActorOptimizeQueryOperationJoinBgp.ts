import type { IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput } from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { IActorTest } from '@comunica/core';
import type { Algebra, Factory } from 'sparqlalgebrajs';
import { Util } from 'sparqlalgebrajs';

/**
 * A comunica Join BGP Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationJoinBgp extends ActorOptimizeQueryOperation {
  public async test(action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const operation = Util.mapOperation(action.operation, {
      join(op: Algebra.Join, factory: Factory) {
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
    });
    return { operation, context: action.context };
  }
}
