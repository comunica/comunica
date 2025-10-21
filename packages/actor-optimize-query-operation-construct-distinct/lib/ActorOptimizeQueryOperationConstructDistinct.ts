import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries/lib/Keys';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';

/**
 * A comunica Construct Distinct Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationConstructDistinct extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    if (!action.context.has(KeysInitQuery.distinctConstruct)) {
      return failTest(`${this.name} was not enabled by the query.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const factory = new AlgebraFactory();
    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.CONSTRUCT]: {
        preVisitor: () => ({ continue: false }),
        transform: constructOp =>
          factory.createDistinct(factory.createConstruct(constructOp.input, constructOp.template)),
      },
    });
    return { operation, context: action.context.delete(KeysInitQuery.distinctConstruct) };
  }
}
