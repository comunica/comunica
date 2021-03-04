import { KeysQueryOperation } from '@comunica/context-entries';
import type { ActionContext, IActorArgs, IActorTest } from '@comunica/core';
import type { IActionQueryOperation, ActorQueryOperationOutput,
  IActorQueryOperationOutputStream } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import { ActorQueryOperation } from './ActorQueryOperation';

/**
 * @type {string} Context entry for the current query operation.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_QUERYOPERATION = KeysQueryOperation.operation;

/**
 * A base implementation for query operation actors for a specific operation type.
 */
export abstract class ActorQueryOperationTyped<O extends Algebra.Operation> extends ActorQueryOperation {
  public readonly operationName: string;

  protected constructor(args: IActorArgs<IActionQueryOperation, IActorTest, ActorQueryOperationOutput>,
    operationName: string) {
    super(<any> { ...args, operationName });
    if (!this.operationName) {
      throw new Error('A valid "operationName" argument must be provided.');
    }
  }

  public async test(action: IActionQueryOperation): Promise<IActorTest> {
    if (!action.operation) {
      throw new Error('Missing field \'operation\' in a query operation action.');
    }
    if (action.operation.type !== this.operationName) {
      throw new Error(`Actor ${this.name} only supports ${this.operationName} operations, but got ${
        action.operation.type}`);
    }
    const operation: O = <O> action.operation;
    return this.testOperation(operation, action.context);
  }

  public async run(action: IActionQueryOperation): Promise<ActorQueryOperationOutput> {
    const operation: O = <O> action.operation;
    const subContext = action.context && action.context.set(KeysQueryOperation.operation, operation);
    const output: ActorQueryOperationOutput = await this.runOperation(operation, subContext);
    if ((<IActorQueryOperationOutputStream> output).metadata) {
      (<IActorQueryOperationOutputStream> output).metadata =
        ActorQueryOperation.cachifyMetadata((<IActorQueryOperationOutputStream> output).metadata);
    }
    return output;
  }

  protected abstract testOperation(operation: O, context: ActionContext | undefined): Promise<IActorTest>;

  protected abstract runOperation(operation: O, context: ActionContext | undefined):
  Promise<ActorQueryOperationOutput>;
}
