import {ActorQueryOperationTypedMediated, Bindings, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {BindingsStream} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Group Query Operation Actor.
 */
export class ActorQueryOperationGroup extends ActorQueryOperationTypedMediated<Algebra.Group> {

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'group');
  }

  public async testOperation(pattern: Algebra.Group, context: ActionContext): Promise<IActorTest> {
    return true; // TODO implement
  }

  public async runOperation(pattern: Algebra.Group, context: ActionContext)
    : Promise<IActorQueryOperationOutput> {
    // Call other query operations like this:
    // const output: IActorQueryOperationOutput = await this.mediatorQueryOperation.mediate({ operation, context });
    return { bindingsStream, metadata, variables }; // TODO: implement
  }

}
