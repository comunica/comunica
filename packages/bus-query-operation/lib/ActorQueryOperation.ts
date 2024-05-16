import type { BindingsFactory } from '@comunica/bindings-factory';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorArgs, IActorTest, IAction, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import { BlankNodeBindingsScoped } from '@comunica/data-factory';
import type {
  IQueryOperationResult,
  IQueryOperationResultBindings,
  IQueryOperationResultBoolean,
  IQueryOperationResultQuads,
  IQueryOperationResultVoid,
  Bindings,
  IActionContext,
  FunctionArgumentsCache,
  IQuerySourceWrapper,
  FragmentSelectorShape,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import { materializeOperation } from './Bindings';

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
   * Throw an error if the output type does not match the expected type.
   * @param {IQueryOperationResult} output A query operation output.
   * @param {string} expectedType The expected output type.
   */
  public static validateQueryOutput(output: IQueryOperationResult, expectedType: IQueryOperationResult['type']): void {
    if (output.type !== expectedType) {
      throw new Error(`Invalid query output type: Expected '${expectedType}' but got '${output.type}'`);
    }
  }

  protected static getBaseExpressionContext(context: IActionContext): IBaseExpressionContext {
    const now: Date | undefined = context.get(KeysInitQuery.queryTimestamp);
    const baseIRI: string | undefined = context.get(KeysInitQuery.baseIRI);
    const functionArgumentsCache: FunctionArgumentsCache = context.get(KeysInitQuery.functionArgumentsCache) ?? {};

    // Handle two variants of providing extension functions
    if (context.has(KeysInitQuery.extensionFunctionCreator) && context.has(KeysInitQuery.extensionFunctions)) {
      throw new Error('Illegal simultaneous usage of extensionFunctionCreator and extensionFunctions in context');
    }
    let extensionFunctionCreator: ((functionNamedNode: RDF.NamedNode) =>
    ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined) | undefined = context
      .get(KeysInitQuery.extensionFunctionCreator);
    // Convert dictionary-based variant to callback
    const extensionFunctions: (Record<string, (args: RDF.Term[]) => Promise<RDF.Term>>) | undefined = context
      .get(KeysInitQuery.extensionFunctions);
    if (extensionFunctions) {
      extensionFunctionCreator = functionNamedNode => extensionFunctions[functionNamedNode.value];
    }

    return { now, baseIRI, extensionFunctionCreator, functionArgumentsCache };
  }

  /**
   * Create an options object that can be used to construct a expression-evaluator synchronous evaluator.
   * @param context An action context.
   * @param _mediatorQueryOperation An optional query query operation mediator.
   *                                If defined, the existence resolver will be defined as `exists`.
   */
  public static getExpressionContext(context: IActionContext, _mediatorQueryOperation?: MediatorQueryOperation):
  ISyncExpressionContext {
    return {
      ...this.getBaseExpressionContext(context),
      bnode: (input?: string) => new BlankNodeBindingsScoped(input ?? `BNODE_${bnodeCounter++}`),
    };
  }

  /**
   * Create an options object that can be used to construct a expression-evaluator asynchronous evaluator.
   * @param context An action context.
   * @param mediatorQueryOperation A query query operation mediator for resolving `exists`.
   * @param bindingsFactory The bindings factory.
   */
  public static getAsyncExpressionContext(
    context: IActionContext,
    mediatorQueryOperation: MediatorQueryOperation,
    bindingsFactory: BindingsFactory,
  ):
    IAsyncExpressionContext {
    return {
      ...this.getBaseExpressionContext(context),
      bnode: (input?: string) => Promise.resolve(new BlankNodeBindingsScoped(input ?? `BNODE_${bnodeCounter++}`)),
      exists: ActorQueryOperation.createExistenceResolver(context, mediatorQueryOperation, bindingsFactory),
    };
  }

  /**
   * Create an existence resolver for usage within an expression context.
   * @param context An action context.
   * @param mediatorQueryOperation A query operation mediator.
   * @param bindingsFactory The bindings factory.
   */
  public static createExistenceResolver(
    context: IActionContext,
    mediatorQueryOperation: MediatorQueryOperation,
    bindingsFactory: BindingsFactory,
  ):
    (expr: Algebra.ExistenceExpression, bindings: Bindings) => Promise<boolean> {
    return async(expr, bindings) => {
      const operation = materializeOperation(expr.input, bindings, bindingsFactory);

      const outputRaw = await mediatorQueryOperation.mediate({ operation, context });
      const output = ActorQueryOperation.getSafeBindings(outputRaw);

      return new Promise<boolean>(
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
  public static throwOnReadOnly(context: IActionContext): void {
    if (context.get(KeysQueryOperation.readOnly)) {
      throw new Error(`Attempted a write operation in read-only mode`);
    }
  }

  /**
   * Obtain the query source attached to the given operation.
   * @param operation An algebra operation.
   */
  public static getOperationSource(operation: Algebra.Operation): IQuerySourceWrapper | undefined {
    return <IQuerySourceWrapper> operation.metadata?.scopedSource;
  }

  /**
   * Assign a source wrapper to the given operation.
   * The operation is copied and returned.
   * @param operation An operation.
   * @param source A source wrapper.
   */
  public static assignOperationSource<O extends Algebra.Operation>(operation: O, source: IQuerySourceWrapper): O {
    operation = { ...operation };
    operation.metadata = operation.metadata ? { ...operation.metadata } : {};
    operation.metadata.scopedSource = source;
    return operation;
  }

  /**
   * Remove the source wrapper from the given operation.
   * The operation is mutated.
   * @param operation An operation.
   */
  public static removeOperationSource(operation: Algebra.Operation): void {
    delete operation.metadata?.scopedSource;
    if (operation.metadata && Object.keys(operation.metadata).length === 0) {
      delete operation.metadata;
    }
  }

  /**
   * Check if the given shape accepts the given query operation.
   * @param shape A shape to test the query operation against.
   * @param operation A query operation to test.
   * @param options Additional options to consider.
   * @param options.joinBindings If additional bindings will be pushed down to the source for joining.
   * @param options.filterBindings If additional bindings will be pushed down to the source for filtering.
   */
  public static doesShapeAcceptOperation(
    shape: FragmentSelectorShape,
    operation: Algebra.Operation,
    options?: {
      joinBindings?: boolean;
      filterBindings?: boolean;
    },
  ): boolean {
    if (shape.type === 'conjunction') {
      return shape.children.every(child => ActorQueryOperation.doesShapeAcceptOperation(child, operation, options));
    }
    if (shape.type === 'disjunction') {
      return shape.children.some(child => ActorQueryOperation.doesShapeAcceptOperation(child, operation, options));
    }
    if (shape.type === 'arity') {
      return ActorQueryOperation.doesShapeAcceptOperation(shape.child, operation, options);
    }

    if ((options?.joinBindings && !shape.joinBindings) ?? (options?.filterBindings && !shape.filterBindings)) {
      return false;
    }

    if (shape.operation.operationType === 'type') {
      return shape.operation.type === 'project' || shape.operation.type === operation.type;
    }
    return shape.operation.pattern.type === operation.type;
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
}

export interface ISyncExpressionContext extends IBaseExpressionContext {
  bnode: (input?: string | undefined) => RDF.BlankNode;
}

export interface IAsyncExpressionContext extends IBaseExpressionContext {
  bnode: (input?: string | undefined) => Promise<RDF.BlankNode>;
  exists?: (expr: Algebra.ExistenceExpression, bindings: Bindings) => Promise<boolean>;
}
