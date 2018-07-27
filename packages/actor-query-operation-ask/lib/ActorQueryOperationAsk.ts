import {ActorQueryOperation, ActorQueryOperationTypedMediated, IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings, IActorQueryOperationOutputBoolean,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Ask Query Operation Actor.
 */
export class ActorQueryOperationAsk extends ActorQueryOperationTypedMediated<Algebra.Ask> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'ask');
  }

  public async testOperation(pattern: Algebra.Ask, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Ask, context: ActionContext)
    : Promise<IActorQueryOperationOutputBoolean> {
    // Call other query operations like this:
    const output: IActorQueryOperationOutput = await this.mediatorQueryOperation.mediate(
      { operation: pattern.input, context });
    const bindings: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(output);
    const booleanResult: Promise<boolean> = new Promise<boolean>((resolve, reject) => {
      // Resolve to true if we find one element, and close immediately
      bindings.bindingsStream.once('data', () => {
        resolve(true);
        bindings.bindingsStream.close();
      });

      // If we reach the end of the stream without finding anything, resolve to false
      bindings.bindingsStream.on('end', () => resolve(false));

      // Reject if an error occurs in the stream
      bindings.bindingsStream.on('error', reject);
    });
    return { type: 'boolean', booleanResult };
  }

}
