import { ActionContext, Actor, IAction, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import { AsyncIterator } from 'asynciterator';
import * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';
import { Bindings, BindingsStream, materializeOperation } from './Bindings';

/**
 * @type {string} Context entry for current metadata.
 *                I.e., the metadata that was used to determine the next BGP operation.
 * @value {any} A metadata hash.
 */
export const KEY_CONTEXT_BGP_CURRENTMETADATA = '@comunica/bus-query-operation:bgpCurrentMetadata';
/**
 * @type {string} Context entry for an array of parent metadata.
 *                I.e., an array of the metadata that was present before materializing the current BGP operations.
 *                This can be passed in 'bgp' actions.
 *                The array entries should correspond to the pattern entries in the BGP.
 * @value {any} An array of metadata hashes.
 */
export const KEY_CONTEXT_BGP_PARENTMETADATA = '@comunica/bus-query-operation:bgpParentMetadata';
/**
 * @type {string} Context entry for indicating which patterns were bound from variables.
 *                I.e., an array of the same length as the value of KEY_CONTEXT_BGP_PARENTMETADATA,
 *                where each array value corresponds to the pattern bindings for the corresponding pattern.
 * @value {any} An array of {@link IPatternBindings}.
 */
export const KEY_CONTEXT_BGP_PATTERNBINDINGS = '@comunica/bus-query-operation:bgpPatternBindings';
/**
 * @type {string} Context entry for parent metadata.
 *                I.e., the metadata that was present before materializing the current operation.
 *                This can be passed in 'pattern' actions.
 * @value {any} A metadata hash.
 */
export const KEY_CONTEXT_PATTERN_PARENTMETADATA = '@comunica/bus-query-operation:patternParentMetadata';
/**
 * @type {string} Context entry for query's base IRI.
 * @value {any} A string.
 */
export const KEY_CONTEXT_BASEIRI = '@comunica/actor-init-sparql:baseIRI';
/**
 * @type {string} A timestamp representing the current time.
 *                This is required for certain SPARQL operations such as NOW().
 * @value {any} a date.
 */
export const KEY_CONTEXT_QUERY_TIMESTAMP = '@comunica/actor-init-sparql:queryTimestamp';

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
  protected constructor(args: IActorArgs<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>) {
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
  public static cachifyMetadata<T extends (() => Promise<{[id: string]: any}>)
  | (undefined | (() => Promise<{[id: string]: any}>))>(metadata: T): T {
    let lastReturn: Promise<{[id: string]: any}>;
    // eslint-disable-next-line no-return-assign,@typescript-eslint/no-misused-promises
    return <T> (metadata && (() => (lastReturn || (lastReturn = metadata()))));
  }

  /**
   * Throw an error if the output type does not match the expected type.
   * @param {IActorQueryOperationOutput} output A query operation output.
   * @param {string} expectedType The expected output type.
   */
  public static validateQueryOutput(output: IActorQueryOperationOutput, expectedType: string): void {
    if (output.type !== expectedType) {
      throw new Error(`Invalid query output type: Expected '${expectedType}' but got '${output.type}'`);
    }
  }

  /**
   * Create an options object that can be used to construct a sparqlee evaluator.
   * @param context An action context.
   * @param mediatorQueryOperation An optional query query operation mediator.
   *                               If defined, the existence resolver will be defined as `exists`.
   */
  public static getExpressionContext(context: ActionContext, mediatorQueryOperation?: Mediator<
  Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
  IActionQueryOperation, IActorTest, IActorQueryOperationOutput>): IExpressionContext {
    if (context) {
      const now: Date = context.get(KEY_CONTEXT_QUERY_TIMESTAMP);
      const baseIRI: string = context.get(KEY_CONTEXT_BASEIRI);
      return {
        now,
        baseIRI,
        ...mediatorQueryOperation ?
          {
            exists: ActorQueryOperation.createExistenceResolver(context, mediatorQueryOperation),
          } :
          {},
      };
    }
    return {};
  }

  /**
   * Create an existence resolver for usage within an expression context.
   * @param context An action context.
   * @param mediatorQueryOperation A query operation mediator.
   */
  public static createExistenceResolver(context: ActionContext, mediatorQueryOperation: Mediator<
  Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
  IActionQueryOperation, IActorTest, IActorQueryOperationOutput>):
    (expr: Algebra.ExistenceExpression, bindings: Bindings) => Promise<boolean> {
    return async(expr, bindings) => {
      const operation = materializeOperation(expr.input, bindings);

      const outputRaw = await mediatorQueryOperation.mediate({ operation, context });
      const output = ActorQueryOperation.getSafeBindings(outputRaw);

      return new Promise(
        (resolve, reject) => {
          output.bindingsStream.on('end', () => {
            resolve(false);
          });

          output.bindingsStream.on('error', reject);

          output.bindingsStream.on('data', () => {
            output.bindingsStream.close();
            resolve(true);
          });
        },
      )
        .then((exists: boolean) => expr.not ? !exists : exists);
    };
  }
}

export interface IExpressionContext {
  now?: Date;
  baseIRI?: string;
  // Exists?: (expr: Algebra.ExistenceExpression, bindings: Bindings) => Promise<boolean>;
  // bnode?: (input?: string) => Promise<RDF.BlankNode>;
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
export type IActorQueryOperationOutput =
  IActorQueryOperationOutputStream |
  IActorQueryOperationOutputQuads |
  IActorQueryOperationOutputBoolean;
export interface IActorQueryOperationOutputBase {
  /**
   * The type of output.
   */
  type: string;
  /**
   * The resulting action context.
   */
  context?: ActionContext;
}

/**
 * Super interface for query operation outputs that represent some for of stream.
 * @see IActorQueryOperationOutputBindings, IActorQueryOperationOutputQuads
 */
export interface IActorQueryOperationOutputStream extends IActorQueryOperationOutputBase {
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
 * Helper function to get the metadata of an action output.
 * @param actionOutput An action output, with an optional metadata function.
 * @return The metadata.
 */
export function getMetadata(actionOutput: IActorQueryOperationOutputStream): Promise<{[id: string]: any}> {
  if (!actionOutput.metadata) {
    return Promise.resolve({});
  }
  return actionOutput.metadata();
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
export interface IActorQueryOperationOutputBoolean extends IActorQueryOperationOutputBase {
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
 * Binds a quad pattern term's position to a variable.
 */
export interface IPatternBindings {
  [termPosition: string]: RDF.Variable;
}
