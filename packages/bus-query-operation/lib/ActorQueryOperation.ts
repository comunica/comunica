import { KeysInitSparql, KeysQueryOperation } from '@comunica/context-entries';
import type { ActionContext, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import { Actor } from '@comunica/core';
import type {
  IActionQueryOperation,
  IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputBoolean,
  IActorQueryOperationOutputQuads,
  IActorQueryOperationOutputStream,
  Bindings,
  PatternBindings,
} from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import { materializeOperation } from './Bindings';

/**
 * @deprecated Use the type in @comunica/types
 */
export type { IActionQueryOperation };

/**
 * @deprecated Use the type in @comunica/types
 */
export type { IActorQueryOperationOutput };

/**
 * @deprecated Use the type in @comunica/types
 */
export type { IActorQueryOperationOutputBindings };

/**
 * @deprecated Use the type in @comunica/types
 */
export type { IActorQueryOperationOutputBoolean };

/**
 * @deprecated Use the type in @comunica/types
 */
export type { IActorQueryOperationOutputQuads };

/**
 * @deprecated Use the type in @comunica/types
 */
export type { IActorQueryOperationOutputStream };

/**
 * @deprecated Use the type in @comunica/types
 */
export type { PatternBindings as IPatternBindings };

/**
 * @type {string} Context entry for current metadata.
 *                I.e., the metadata that was used to determine the next BGP operation.
 * @value {any} A metadata hash.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_BGP_CURRENTMETADATA = KeysQueryOperation.bgpCurrentMetadata;
/**
 * @type {string} Context entry for an array of parent metadata.
 *                I.e., an array of the metadata that was present before materializing the current BGP operations.
 *                This can be passed in 'bgp' actions.
 *                The array entries should correspond to the pattern entries in the BGP.
 * @value {any} An array of metadata hashes.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_BGP_PARENTMETADATA = KeysQueryOperation.bgpParentMetadata;
/**
 * @type {string} Context entry for indicating which patterns were bound from variables.
 *                I.e., an array of the same length as the value of KeysQueryOperation.patternParentMetadata,
 *                where each array value corresponds to the pattern bindings for the corresponding pattern.
 * @value {any} An array of {@link PatternBindings}.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_BGP_PATTERNBINDINGS = KeysQueryOperation.bgpPatternBindings;
/**
 * @type {string} Context entry for parent metadata.
 *                I.e., the metadata that was present before materializing the current operation.
 *                This can be passed in 'pattern' actions.
 * @value {any} A metadata hash.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_PATTERN_PARENTMETADATA = KeysQueryOperation.patternParentMetadata;
/**
 * @type {string} Context entry for query's base IRI.
 * @value {any} A string.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_BASEIRI = KeysInitSparql.baseIRI;
/**
 * @type {string} A timestamp representing the current time.
 *                This is required for certain SPARQL operations such as NOW().
 * @value {any} a date.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_QUERY_TIMESTAMP = KeysInitSparql.queryTimestamp;

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
  public static cachifyMetadata<T extends (() => Promise<Record<string, any>>)
  | (undefined | (() => Promise<Record<string, any>>))>(metadata: T): T {
    let lastReturn: Promise<Record<string, any>>;
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
      const now: Date = context.get(KeysInitSparql.queryTimestamp);
      const baseIRI: string = context.get(KeysInitSparql.baseIRI);
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

/**
 * Helper function to get the metadata of an action output.
 * @param actionOutput An action output, with an optional metadata function.
 * @return The metadata.
 */
export function getMetadata(actionOutput: IActorQueryOperationOutputStream): Promise<Record<string, any>> {
  if (!actionOutput.metadata) {
    return Promise.resolve({});
  }
  return actionOutput.metadata();
}

export interface IExpressionContext {
  now?: Date;
  baseIRI?: string;
  // Exists?: (expr: Algebra.ExistenceExpression, bindings: Bindings) => Promise<boolean>;
  // bnode?: (input?: string) => Promise<RDF.BlankNode>;
}
