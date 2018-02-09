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

  /**
   * Throw an error if the output type does not match the expected type.
   * @param {IActorQueryOperationOutput} output A query operation output.
   * @param {string} expectedType The expected output type.
   */
  public static validateQueryOutput(output: IActorQueryOperationOutput, expectedType: string) {
    if (output.type !== expectedType) {
      throw new Error('Invalid query output type: Expected \'' + expectedType + '\' but got \'' + output.type + '\'');
    }
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
   * The type of output.
   */
  type: QueryOperationOutputType;
  /**
   * The stream of bindings resulting from the given operation.
   * This must be defined iff the query operation output type equals 'bindings'.
   */
  bindingsStream?: BindingsStream;
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
   * The stream of quads.
   * This must be defined iff the query operation output type equals 'quads'.
   * This is used in cases where no bindings are returned,
   * but instead, a stream of quads is produced.
   * For example: SPARQL CONSTRUCT results
   */
  quadStream?: RDF.Stream;

}

export type QueryOperationOutputType = 'bindings' | 'quads';
