import { KeysQueryOperation } from '@comunica/context-entries';
import type { IActorArgs, IActorTest, IAction, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IQueryOperationResult,
  IQueryOperationResultBindings,
  IQueryOperationResultBoolean,
  IQueryOperationResultQuads,
  IQueryOperationResultVoid,
  Bindings,
  IMetadata, IActionContext,
  FunctionArgumentsCache } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica actor for query-operation events.
 *
 * Actor types:
 * * Input:  IActionQueryOperation:      A SPARQL Algebra operation.
 * * Test:   <none>
 * * Output: IActorQueryOperationOutput: A bindings stream.
 *
 * @see IActionQueryOperation
 * @see IQueryOperationResult
 */
export abstract class ActorQueryOperation extends Actor<IActionQueryOperation, IActorTest, IQueryOperationResult> {
  /**
   * @param args - @defaultNested {<default_bus> a <cbqo:components/BusQueryOperation.jsonld#BusQueryOperation>} bus
   */
  protected constructor(args: IActorQueryOperationArgs) {
    super(args);
  }

  /**
   * Safely cast a query operation output to a bindings output.
   * This will throw a runtime error if the output is of the incorrect type.
   * @param {IQueryOperationResult} output A query operation output.
   * @return {IQueryOperationResultBindings} A bindings query operation output.
   */
  public static getSafeBindings(output: IQueryOperationResult): IQueryOperationResultBindings {
    ActorQueryOperation.validateQueryOutput(output, 'bindings');
    return <IQueryOperationResultBindings> output;
  }

  /**
   * Safely cast a query operation output to a quads output.
   * This will throw a runtime error if the output is of the incorrect type.
   * @param {IQueryOperationResult} output A query operation output.
   * @return {IQueryOperationResultQuads} A quads query operation output.
   */
  public static getSafeQuads(output: IQueryOperationResult): IQueryOperationResultQuads {
    ActorQueryOperation.validateQueryOutput(output, 'quads');
    return <IQueryOperationResultQuads> output;
  }

  /**
   * Safely cast a query operation output to a boolean output.
   * This will throw a runtime error if the output is of the incorrect type.
   * @param {IQueryOperationResult} output A query operation output.
   * @return {IQueryOperationResultBoolean} A boolean query operation output.
   */
  public static getSafeBoolean(output: IQueryOperationResult): IQueryOperationResultBoolean {
    ActorQueryOperation.validateQueryOutput(output, 'boolean');
    return <IQueryOperationResultBoolean> output;
  }

  /**
   * Safely cast a query operation output to a void output.
   * This will throw a runtime error if the output is of the incorrect type.
   * @param {IQueryOperationResult} output A query operation output.
   * @return {IQueryOperationResultVoid} A void query operation output.
   */
  public static getSafeVoid(output: IQueryOperationResult): IQueryOperationResultVoid {
    ActorQueryOperation.validateQueryOutput(output, 'void');
    return <IQueryOperationResultVoid> output;
  }

  /**
   * Convert a metadata callback to a lazy callback where the response value is cached.
   * @param {() => Promise<IMetadata>} metadata A metadata callback
   * @return {() => Promise<{[p: string]: any}>} The callback where the response will be cached.
   */
  public static cachifyMetadata<M extends IMetadata<T>, T extends RDF.Variable | RDF.QuadTermName>(
    metadata: () => Promise<M>,
  ): () => Promise<M> {
    let lastReturn: Promise<M> | undefined;
    return () => {
      if (!lastReturn) {
        lastReturn = metadata();
        lastReturn
          .then(lastReturnValue => lastReturnValue.state.addInvalidateListener(() => {
            lastReturn = undefined;
          }))
          .catch(() => {
            // Ignore error
          });
      }
      return lastReturn;
    };
  }

  /**
   * Throw an error if the output type does not match the expected type.
   * @param {IQueryOperationResult} output A query operation output.
   * @param {string} expectedType The expected output type.
   */
  public static validateQueryOutput(output: IQueryOperationResult, expectedType: IQueryOperationResult['type']): void {
    if (output.type !== expectedType) {
      throw new Error(`Invalid query output type: Expected '${expectedType}' but got '${output.type}'`);
    }
  }

  /**
   * Throw an error if the context contains the readOnly flag.
   * @param context An action context.
   */
  public static throwOnReadOnly(context: IActionContext): void {
    if (context.get(KeysQueryOperation.readOnly)) {
      throw new Error(`Attempted a write operation in read-only mode`);
    }
  }
}

export interface IActionQueryOperation extends IAction {
  /**
   * The query operation to handle.
   */
  operation: Algebra.Operation;
}

export type IActorQueryOperationArgs = IActorArgs<IActionQueryOperation, IActorTest, IQueryOperationResult>;

export type MediatorQueryOperation = Mediate<IActionQueryOperation, IQueryOperationResult>;

export interface IBaseExpressionContext {
  now?: Date;
  baseIRI?: string;
  extensionFunctionCreator?: (functionNamedNode: RDF.NamedNode) =>
  ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined;
  functionArgumentsCache?: FunctionArgumentsCache;
  actionContext: IActionContext;
}

export interface ISyncExpressionContext extends IBaseExpressionContext {
  bnode: (input?: string | undefined) => RDF.BlankNode;
}

export interface IAsyncExpressionContext extends IBaseExpressionContext {
  bnode: (input?: string | undefined) => Promise<RDF.BlankNode>;
  exists?: (expr: Algebra.ExistenceExpression, bindings: Bindings) => Promise<boolean>;
}
