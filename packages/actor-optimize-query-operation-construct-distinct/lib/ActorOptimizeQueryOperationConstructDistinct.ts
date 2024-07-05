import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries/lib/Keys';
import type { IActorTest } from '@comunica/core';
import type { Algebra, Factory } from 'sparqlalgebrajs';
import { Util } from 'sparqlalgebrajs';

/**
 * A comunica Construct Distinct Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationConstructDistinct extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    if (!action.context.has(KeysInitQuery.distinctConstruct)) {
      throw new Error(`${this.name} was not enabled by the query.`);
    }
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const operation = Util.mapOperation(action.operation, {
      construct(op: Algebra.Construct, factory: Factory) {
        return {
          recurse: false,
          result: factory.createDistinct(factory.createConstruct(op.input, op.template)),
        };
      },
    });
    return { operation, context: action.context.delete(KeysInitQuery.distinctConstruct) };
  }
}
