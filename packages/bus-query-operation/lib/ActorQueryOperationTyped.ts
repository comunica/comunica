import {IActorArgs, IActorTest} from "@comunica/core";
import {AsyncIterator, BufferedIterator, SimpleTransformIteratorOptions} from "asynciterator";
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
    super(args);
    this.operationName = operationName;
    if (!this.operationName) {
      throw new Error('A valid "operationName" argument must be provided.');
    }
  }

  public async test(action: IActionQueryOperation): Promise<IActorTest> {
    if (!action.operation) {
      throw new Error('Missing field \'operation\' in the query operation action: ' + require('util').inspect(action));
    }
    if (action.operation && action.operation.type !== this.operationName) {
      throw new Error('Actor ' + this.name + ' only supports ' + this.operationName + ' operations, but got '
        + action.operation.type);
    }
    const operation: O = <O> action.operation;
    return this.testOperation(operation, action.context);
  }

  public async run(action: IActionQueryOperation): Promise<IActorQueryOperationOutput> {
    const operation: O = <O> action.operation;
    const output: IActorQueryOperationOutput = await this.runOperation(operation, action.context);
    if ((<IActorQueryOperationOutputStream> output).metadata) {
      (<IActorQueryOperationOutputStream> output).metadata =
        ActorQueryOperation.cachifyMetadata((<IActorQueryOperationOutputStream> output).metadata);
    }
    return output;
  }

  protected abstract async testOperation(operation: O, context?: {[id: string]: any}): Promise<IActorTest>;

  protected abstract runOperation(operation: O, context?: {[id: string]: any}): Promise<IActorQueryOperationOutput>;

}
