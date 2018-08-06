import {ActorQueryOperationTyped, Bindings, IActionQueryOperation,
  IActorQueryOperationOutput, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {ActionContext, IActorArgs, IActorTest} from "@comunica/core";
import {SingletonIterator} from "asynciterator";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Query Operation Actor for empty BGPs.
 */
export class ActorQueryOperationBgpEmpty extends ActorQueryOperationTyped<Algebra.Bgp> {

  constructor(args: IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>) {
    super(args, 'bgp');
  }

  public async testOperation(pattern: Algebra.Bgp, context: ActionContext): Promise<IActorTest> {
    if (pattern.patterns.length !== 0) {
      throw new Error('Actor ' + this.name + ' can only operate on empty BGPs.');
    }
    return true;
  }

  public async runOperation(pattern: Algebra.Bgp, context: ActionContext)
  : Promise<IActorQueryOperationOutputBindings> {
    return {
      bindingsStream: new SingletonIterator(Bindings({})),
      metadata: () => Promise.resolve({ totalItems: 1 }),
      type: 'bindings',
      variables: [],
    };
  }

}
