import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";

/**
 * A comunica actor for optimize-query-operation events.
 *
 * Actor types:
 * * Input:  IActionOptimizeQueryOperation:      An incoming SPARQL operation.
 * * Test:   <none>
 * * Output: IActorOptimizeQueryOperationOutput: A (possibly optimized) outgoing SPARQL operation.
 *
 * @see IActionOptimizeQueryOperation
 * @see IActorOptimizeQueryOperationOutput
 */
export abstract class ActorOptimizeQueryOperation
  extends Actor<IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput> {

  constructor(args: IActorArgs<IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput>) {
    super(args);
  }

}

export interface IActionOptimizeQueryOperation extends IAction {
  operation: Algebra.Operation;
}

export interface IActorOptimizeQueryOperationOutput extends IActorOutput {
  operation: Algebra.Operation;
}
