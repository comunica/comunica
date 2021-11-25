import { KeysInitSparql, KeysQueryOperation } from '@comunica/context-entries';
import type { ActionContext, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import { Actor } from '@comunica/core';
import { BlankNodeBindingsScoped } from '@comunica/data-factory';
import type {
  IActionQueryOperation,
  IActorQueryOperationOutput,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputBoolean,
  IActorQueryOperationOutputQuads,
  IActorQueryOperationOutputUpdate,
  IActorQueryOperationOutputStream,
  Bindings,
  IMetadata,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import { materializeOperation } from './Bindings';

/**
 * @deprecated Use the type in @comunica/types
 */
export type { IActionQueryOperation };

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
export type { IActorQueryOperationOutputUpdate };

/**
 * @deprecated Use the type in @comunica/types
 */
export type { IActorQueryOperationOutputStream };

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
 * @type {string} Context entry for indicating that only read operations are allowed, defaults to false.
 * @value {any} A boolean.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_READONLY = KeysQueryOperation.readOnly;

/**
 * A counter that keeps track blank node generated through BNODE() SPARQL
 * expressions.
 *
 * @type {number}
 */
let bnodeCounter = 0;

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
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
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
   * Safely cast a query operation output to an update output.
   * This will throw a runtime error if the output is of the incorrect type.
   * @param {IActorQueryOperationOutput} output A query operation output.
   * @return {IActorQueryOperationOutputUpdate} An update query operation output.
   */
  public static getSafeUpdate(output: IActorQueryOperationOutput): IActorQueryOperationOutputUpdate {
    ActorQueryOperation.validateQueryOutput(output, 'update');
    return <IActorQueryOperationOutputUpdate> output;
  }

  /**
   * Convert a metadata callback to a lazy callback where the response value is cached.
   * @param {() => Promise<IMetadata>} metadata A metadata callback
   * @return {() => Promise<{[p: string]: any}>} The callback where the response will be cached.
   */
  public static cachifyMetadata(metadata: () => Promise<IMetadata>): () => Promise<IMetadata> {
    let lastReturn: Promise<IMetadata>;
    // eslint-disable-next-line no-return-assign,@typescript-eslint/no-misused-promises
    return () => (lastReturn || (lastReturn = metadata()));
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

  protected static getBaseExpressionContext(context: ActionContext): IBaseExpressionContext {
    if (context) {
      const now: Date = context.get(KeysInitSparql.queryTimestamp);
      const baseIRI: string = context.get(KeysInitSparql.baseIRI);

      // Handle two variants of providing extension functions
      if (context.has(KeysInitSparql.extensionFunctionCreator) && context.has(KeysInitSparql.extensionFunctions)) {
        throw new Error('Illegal simultaneous usage of extensionFunctionCreator and extensionFunctions in context');
      }
      let extensionFunctionCreator: (functionNamedNode: RDF.NamedNode) =>
      ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined = context.get(KeysInitSparql.extensionFunctionCreator);
      // Convert dictionary-based variant to callback
      const extensionFunctions: Record<string, (args: RDF.Term[]) => Promise<RDF.Term>> = context
        .get(KeysInitSparql.extensionFunctions);
      if (extensionFunctions) {
        extensionFunctionCreator = functionNamedNode => extensionFunctions[functionNamedNode.value];
      }

      return { now, baseIRI, extensionFunctionCreator };
    }
    return {};
  }

  /**
   * Create an options object that can be used to construct a sparqlee synchronous evaluator.
   * @param context An action context.
   * @param mediatorQueryOperation An optional query query operation mediator.
   *                               If defined, the existence resolver will be defined as `exists`.
   */
  public static getExpressionContext(context: ActionContext, mediatorQueryOperation?: Mediator<
  Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
  IActionQueryOperation, IActorTest, IActorQueryOperationOutput>): IExpressionContext {
    return {
      ...this.getBaseExpressionContext(context),
      bnode: (input?: string) => new BlankNodeBindingsScoped(input || `BNODE_${bnodeCounter++}`),
    };
  }

  /**
   * Create an options object that can be used to construct a sparqlee asynchronous evaluator.
   * @param context An action context.
   * @param mediatorQueryOperation An optional query query operation mediator.
   *                               If defined, the existence resolver will be defined as `exists`.
   */
  public static getAsyncExpressionContext(context: ActionContext, mediatorQueryOperation?: Mediator<
  Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
  IActionQueryOperation, IActorTest, IActorQueryOperationOutput>): IAsyncExpressionContext {
    const expressionContext: IAsyncExpressionContext = {
      ...this.getBaseExpressionContext(context),
      bnode: (input?: string) => Promise.resolve(new BlankNodeBindingsScoped(input || `BNODE_${bnodeCounter++}`)),
    };
    if (context && mediatorQueryOperation) {
      expressionContext.exists = ActorQueryOperation.createExistenceResolver(context, mediatorQueryOperation);
    }
    return expressionContext;
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

  /**
   * Throw an error if the context contains the readOnly flag.
   * @param context An action context.
   */
  public static throwOnReadOnly(context?: ActionContext): void {
    if (context && context.get(KEY_CONTEXT_READONLY)) {
      throw new Error(`Attempted a write operation in read-only mode`);
    }
  }
}

export interface IBaseExpressionContext {
  now?: Date;
  baseIRI?: string;
  extensionFunctionCreator?: (functionNamedNode: RDF.NamedNode) =>
  ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined;
}

// TODO: rename to ISyncExpressionContext in next major version
export interface IExpressionContext extends IBaseExpressionContext {
  bnode: (input?: string | undefined) => RDF.BlankNode;
}

export interface IAsyncExpressionContext extends IBaseExpressionContext {
  bnode: (input?: string | undefined) => Promise<RDF.BlankNode>;
  exists?: (expr: Algebra.ExistenceExpression, bindings: Bindings) => Promise<boolean>;
}
