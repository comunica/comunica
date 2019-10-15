import {ActionContext, IActorArgs, IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";
import {
  ActorQueryOperation, IActionQueryOperation, IActorQueryOperationOutput,
  IActorQueryOperationOutputStream } from "./ActorQueryOperation";

/**
 * A base implementation for query operation actors for a specific operation type.
 */
export abstract class ActorQueryOperationTyped<O extends Algebra.Operation> extends ActorQueryOperation {

  public readonly operationName: string;

  constructor(args: IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>, operationName: string) {
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
      throw new Error('Actor ' + this.name + ' only supports ' + this.operationName + ' operations, but got '
        + action.operation.type);
    }
    const operation: O = <O> action.operation;
    return this.testOperation(operation, action.context);
  }

  public async run(action: IActionQueryOperation): Promise<IActorQueryOperationOutput> {
    const operation: O = <O> action.operation;
    const subContext = action.context ? action.context.set(KEY_CONTEXT_QUERYOPERATION, operation) : null;
    const output: IActorQueryOperationOutput = await this.runOperation(operation, subContext);
    if ((<IActorQueryOperationOutputStream> output).metadata) {
      (<IActorQueryOperationOutputStream> output).metadata =
        ActorQueryOperation.cachifyMetadata((<IActorQueryOperationOutputStream> output).metadata);
    }
    return output;
  }

  protected abstract async testOperation(operation: O, context: ActionContext): Promise<IActorTest>;

  protected abstract runOperation(operation: O, context: ActionContext): Promise<IActorQueryOperationOutput>;

}

/**
 * @type {string} Context entry for the current query operation.
 */
export const KEY_CONTEXT_QUERYOPERATION = '@comunica/bus-query-operation:operation';
