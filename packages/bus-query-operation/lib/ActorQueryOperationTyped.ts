import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest } from '@comunica/core';
import type {
  IQueryOperationResult,
  IPhysicalQueryPlanLogger,
  IActionContext,
  IMetadata,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { cachifyMetadata } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import type { IActionQueryOperation, IActorQueryOperationArgs } from './ActorQueryOperation';
import { ActorQueryOperation } from './ActorQueryOperation';

/**
 * A base implementation for query operation actors for a specific operation type.
 */
export abstract class ActorQueryOperationTyped<
  O extends Algebra.Operation,
TS = undefined,
> extends ActorQueryOperation<TS> {
  /**
   * The SPARQL algebra operation type this actor handles.
   */
  public readonly operationName: string;

  protected constructor(args: IActorQueryOperationArgs<TS>, operationName: string) {
    super(args);
    this.operationName = operationName;
    if (!this.operationName) {
      throw new Error('A valid "operationName" argument must be provided.');
    }
  }

  /**
   * Tests whether this actor can handle the given query operation action.
   * @param action The query operation action.
   * @return A test result indicating whether this actor can handle the operation.
   */
  public async test(action: IActionQueryOperation): Promise<TestResult<IActorTest, TS>> {
    if (!action.operation) {
      return failTest('Missing field \'operation\' in a query operation action.');
    }
    if (action.operation.type !== this.operationName) {
      return failTest(`Actor ${this.name} only supports ${this.operationName} operations, but got ${
          action.operation.type}`);
    }
    const operation: O = <O> action.operation;
    return this.testOperation(operation, action.context);
  }

  /**
   * Runs the query operation with physical plan logging and metadata caching.
   * @param action The query operation action.
   * @param sideData Side data from the test phase.
   * @return The query operation result.
   */
  public async run(action: IActionQueryOperation, sideData: TS): Promise<IQueryOperationResult> {
    // Log to physical plan
    const physicalQueryPlanLogger: IPhysicalQueryPlanLogger | undefined = action.context
      .get(KeysInitQuery.physicalQueryPlanLogger);
    if (physicalQueryPlanLogger) {
      physicalQueryPlanLogger.logOperation(
        action.operation.type,
        undefined,
        action.operation,
        action.context.get(KeysInitQuery.physicalQueryPlanNode),
        this.name,
        {},
      );
      action.context = action.context.set(KeysInitQuery.physicalQueryPlanNode, action.operation);
    }

    const operation: O = <O> action.operation;
    const subContext = action.context.set(KeysQueryOperation.operation, operation);
    const output: IQueryOperationResult = await this.runOperation(operation, subContext, sideData);
    if ('metadata' in output) {
      output.metadata = <any>
        cachifyMetadata<IMetadata<RDF.QuadTermName | RDF.Variable>, RDF.QuadTermName | RDF.Variable>(output.metadata);
    }
    return output;
  }

  /**
   * Tests whether this actor can handle the specific operation type.
   * @param operation The typed algebra operation.
   * @param context The action context.
   * @return A test result for the specific operation.
   */
  protected abstract testOperation(operation: O, context: IActionContext): Promise<TestResult<IActorTest, TS>>;

  /**
   * Executes the specific operation type.
   * @param operation The typed algebra operation.
   * @param context The action context.
   * @param sideData Side data from the test phase.
   * @return The query operation result.
   */
  protected abstract runOperation(operation: O, context: IActionContext, sideData: TS):
  Promise<IQueryOperationResult>;
}
