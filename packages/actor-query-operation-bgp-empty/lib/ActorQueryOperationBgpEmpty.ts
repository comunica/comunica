import {ActorQueryOperationTyped, IActionQueryOperation,
  IActorQueryOperationOutput, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {IActorArgs, IActorTest} from "@comunica/core";
import {EmptyIterator} from "asynciterator";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica Query Operation Actor for empty BGPs.
 */
export class ActorQueryOperationBgpEmpty extends ActorQueryOperationTyped<Algebra.Bgp> {

  constructor(args: IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>) {
    super(args, 'bgp');
  }

  public async testOperation(pattern: Algebra.Bgp, context?: {[id: string]: any}): Promise<IActorTest> {
    if (pattern.patterns.length !== 0) {
      throw new Error('Actor ' + this.name + ' can only operate on empty BGPs.');
    }
    return true;
  }

  public async runOperation(pattern: Algebra.Bgp, context?: {[id: string]: any})
  : Promise<IActorQueryOperationOutputBindings> {
    return {
      bindingsStream: new EmptyIterator(),
      metadata: Promise.resolve({ totalItems: 0 }),
      type: 'bindings',
      variables: [],
    };
  }

}
