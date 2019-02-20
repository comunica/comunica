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
   * Safely cast a query operation output to a bindings output.
   * This will throw a runtime error if the output is of the incorrect type.
   * @param {IActorQueryOperationOutput} output A query operation output.
   * @return {IActorQueryOperationOutputBindings} A bindings query operation output.
   */
  public static getSafeBindings(output: IActorQueryOperationOutput): IActorQueryOperationOutputBindings {
    ActorQueryOperation.validateQueryOutput(output, 'bindings');
    return <IActorQueryOperationOutputBindings> output;
  }

  /**
   * Safely cast a query operation output to a quads output.
   * This will throw a runtime error if the output is of the incorrect type.
   * @param {IActorQueryOperationOutput} output A query operation output.
   * @return {IActorQueryOperationOutputQuads} A quads query operation output.
   */
  public static getSafeQuads(output: IActorQueryOperationOutput): IActorQueryOperationOutputQuads {
    ActorQueryOperation.validateQueryOutput(output, 'quads');
    return <IActorQueryOperationOutputQuads> output;
  }

  /**
   * Safely cast a query operation output to a boolean output.
   * This will throw a runtime error if the output is of the incorrect type.
   * @param {IActorQueryOperationOutput} output A query operation output.
   * @return {IActorQueryOperationOutputBoolean} A boolean query operation output.
   */
  public static getSafeBoolean(output: IActorQueryOperationOutput): IActorQueryOperationOutputBoolean {
    ActorQueryOperation.validateQueryOutput(output, 'boolean');
    return <IActorQueryOperationOutputBoolean> output;
  }

  /**
   * Convert a metadata callback to a lazy callback where the response value is cached.
   * @param {() => Promise<{[p: string]: any}>} metadata A metadata callback
   * @return {() => Promise<{[p: string]: any}>} The callback where the response will be cached.
   */
  public static cachifyMetadata(metadata: () => Promise<{[id: string]: any}>): () => Promise<{[id: string]: any}> {
    let lastReturn: Promise<{[id: string]: any}> = null;
    return () => (lastReturn || (lastReturn = metadata()));
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
}

/**
 * Query operation output.
 * @see IActorQueryOperationOutputBindings, IActorQueryOperationOutputQuads, IActorQueryOperationOutputBoolean
 */
export interface IActorQueryOperationOutput {
  /**
   * The type of output.
   */
  type: string;
}

/**
 * Super interface for query operation outputs that represent some for of stream.
 * @see IActorQueryOperationOutputBindings, IActorQueryOperationOutputQuads
 */
export interface IActorQueryOperationOutputStream extends IActorQueryOperationOutput {
  /**
   * Callback that returns a promise that resolves to the metadata about the stream.
   * This can contain things like the estimated number of total stream elements,
   * or the order in which the bindings appear.
   * This callback can be invoked multiple times.
   * The actors that return this metadata will make sure that multiple calls properly cache this promise.
   * Metadata will not be collected until this callback is invoked.
   */
  metadata?: () => Promise<{[id: string]: any}>;
}

/**
 * Query operation output for a bindings stream.
 * For example: SPARQL SELECT results
 */
export interface IActorQueryOperationOutputBindings extends IActorQueryOperationOutputStream {
  /**
   * The type of output.
   */
  type: 'bindings';
  /**
   * The stream of bindings resulting from the given operation.
   */
  bindingsStream: BindingsStream;
  /**
   * The list of variable names (without '?') for which bindings are provided in the stream.
   */
  variables: string[];

}

/**
 * Query operation output for quads.
 * For example: SPARQL CONSTRUCT results
 */
export interface IActorQueryOperationOutputQuads extends IActorQueryOperationOutputStream {
  /**
   * The type of output.
   */
  type: 'quads';
  /**
   * The stream of quads.
   */
  quadStream: RDF.Stream & AsyncIterator<RDF.Quad>;

}

/**
 * Query operation output for quads.
 * For example: SPARQL ASK results
 */
export interface IActorQueryOperationOutputBoolean extends IActorQueryOperationOutput {
  /**
   * The type of output.
   */
  type: 'boolean';
  /**
   * A promise resolving to the boolean output of the operation.
   */
  booleanResult: Promise<boolean>;

}

/**
 * @type {string} Context entry for an array of parent metadata.
 *                I.e., an array of the metadata that was present before materializing the current BGP operations.
 *                This can be passed in 'bgp' actions.
 *                The array entries should correspond to the pattern entries in the BGP.
 * @value {any} A metadata hash.
 */
export const KEY_CONTEXT_BGP_PARENTMETADATA: string = '@comunica/bus-query-operation:bgpParentMetadata';
/**
 * @type {string} Context entry for parent metadata.
 *                I.e., the metadata that was present before materializing the current operation.
 *                This can be passed in 'pattern' actions.
 * @value {any} A metadata hash.
 */
export const KEY_CONTEXT_PATTERN_PARENTMETADATA: string = '@comunica/bus-query-operation:patternParentMetadata';
