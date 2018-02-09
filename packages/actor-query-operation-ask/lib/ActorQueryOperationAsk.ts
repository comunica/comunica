import {ActorQueryOperation, ActorQueryOperationTypedMediated, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Ask Query Operation Actor.
 */
export class ActorQueryOperationAsk extends ActorQueryOperationTypedMediated<Algebra.Ask> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'ask');
  }

  public async testOperation(pattern: Algebra.Ask, context?: {[id: string]: any}): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Ask, context?: {[id: string]: any})
    : Promise<IActorQueryOperationOutput> {
    // Call other query operations like this:
    const output: IActorQueryOperationOutput = await this.mediatorQueryOperation.mediate(
      { operation: pattern.input, context });
    ActorQueryOperation.validateQueryOutput(output, 'bindings');
    const booleanResult: Promise<boolean> = new Promise<boolean>(<any> ((resolve: any, reject: any, onCancel: any) => {
      // Close the bindings stream when the promise is cancelled.
      onCancel(output.bindingsStream.close);

      // Resolve to true if we find one element, and close immediately
      output.bindingsStream.once('data', () => {
        resolve(true);
        output.bindingsStream.close();
      });

      // If we reach the end of the stream without finding anything, resolve to false
      output.bindingsStream.on('end', () => resolve(false));

      // Reject if an error occurs in the stream
      output.bindingsStream.on('error', reject);
    }));
    return { type: 'boolean', booleanResult, variables: [] };
  }

}
