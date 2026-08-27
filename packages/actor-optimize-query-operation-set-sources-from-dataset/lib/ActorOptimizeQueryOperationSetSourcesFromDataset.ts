import { ActorOptimizeQueryOperation, IActionOptimizeQueryOperation, IActorOptimizeQueryOperationOutput, IActorOptimizeQueryOperationArgs } from '@comunica/bus-optimize-query-operation';
import { TestResult, IActorTest, passTestVoid } from '@comunica/core';

/**
 * A comunica Optimize Query Operation Set Sources From Dataset Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationOptimizeQueryOperationSetSourcesFromDataset extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid(); // TODO implement
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    return true; // TODO implement
  }
}
