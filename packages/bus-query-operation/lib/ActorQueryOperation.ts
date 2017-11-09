import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import {AsyncIterator, BufferedIterator, SimpleTransformIteratorOptions} from "asynciterator";
import {Operation} from "sparqlalgebrajs";
import {BindingsStream} from "./Bindings";

/**
 * A comunica actor for query-operation events.
 *
 * Actor types:
 * * Input:  IActionQueryOperation:      A SPARQL Algebra operation.
 * * Test:   <none>
 * * Output: IActorQueryOperationOutput: A bindings stream.
 *
 * @see IActionQueryOperation
 * @see IActorQueryOperationOutput
 */
export abstract class ActorQueryOperation extends Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput> {

  constructor(args: IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>) {
    super(args);
  }

}

export interface IActionQueryOperation extends IAction {
  /**
   * The query operation to handle.
   */
  operation: Operation;
  /**
   * The input context,
   * which can contain things such as the entrypoint URL
   * in which the pattern should be resolved.
   */
  context?: {[id: string]: any};
}

export interface IActorQueryOperationOutput extends IActorOutput {
  /**
   * The stream of bindings resulting from the given operation.
   */
  bindingsStream: BindingsStream;
  /**
   * The list of variable names (without '?') for which bindings are provided in this stream.
   */
  variables: string[];
  /**
   * Metadata about the bindings stream.
   * This can contain things like the estimated number of total bindings,
   * or the order in which the bindings appear.
   */
  metadata?: {[id: string]: any};
}
