import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { passTestVoid, type IActorTest, type TestResult } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';

/**
 * A comunica Optimize Query Operation Set Sources From Dataset Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationSetSourcesFromDataset extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    // TODO: add context option to enable/disable (or do it in test)
    const isEnabled = true;
    if (!isEnabled) {
      return { operation: action.operation, context: action.context };
    }

    const datasetClauses = this.extractDatasetClauses(action.operation);

    if (datasetClauses.defaultGraphs.length === 0 && datasetClauses.namedGraphs.length === 0) {
      // No FROM/FROM NAMED present - nothing to do.
      return { operation: action.operation, context: action.context };
    }

    const context = this.appendSources(action.context, datasetClauses);
    const operation = this.stripDatasetClauses(action.operation, datasetClauses);

    return { operation, context };
  }

  private extractDatasetClauses(operation: Algebra.Operation): IDatasetClauses {
    const defaultGraphs: string[] = [];
    const namedGraphs: string[] = [];

    // TODO

    return { defaultGraphs, namedGraphs };
  }

  private appendSources(context: IActionContext, clauses: IDatasetClauses): IActionContext {
    // TODO

    return context;
  }

  private stripDatasetClauses(operation: Algebra.Operation, clauses: IDatasetClauses): Algebra.Operation {
    // TODO

    return operation;
  }
}

interface IDatasetClauses {
  defaultGraphs: string[];
  namedGraphs: string[];
}
