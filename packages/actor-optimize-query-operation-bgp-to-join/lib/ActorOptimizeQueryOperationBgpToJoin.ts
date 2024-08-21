import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory, Util } from 'sparqlalgebrajs';

/**
 * A comunica BGP to Join Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationBgpToJoin extends ActorOptimizeQueryOperation {
  public async test(_action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);

    const operation = Util.mapOperation(action.operation, {
      bgp(op: Algebra.Bgp, factory: Factory) {
        return {
          recurse: false,
          result: factory.createJoin(op.patterns),
        };
      },
    }, algebraFactory);
    return { operation, context: action.context };
  }
}
