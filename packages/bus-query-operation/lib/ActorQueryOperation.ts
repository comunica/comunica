import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import {AsyncIterator, BufferedIterator, SimpleTransformIteratorOptions} from "asynciterator";
import * as RDF from "rdf-js";
import {Algebra} from "sparqlalgebrajs";
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
  operation: Algebra.Operation;
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
   * The list of variable names (without '?') for which bindings are provided in the bindingsStream.
   */
  variables: string[];
  /**
   * Promise that resolves to the metadata about the stream.
   * This can contain things like the estimated number of total stream elements,
   * or the order in which the bindings appear.
   */
  metadata?: Promise<{[id: string]: any}>;
  /**
   * An optional stream of quads.
   * This is used in cases where no bindings are returned,
   * but instead, a stream of quads is produced.
   * For example: SPARQL CONSTRUCT results
   */
  quadStream?: RDF.Stream;
}
