import type { BindingsFactory } from '@comunica/bindings-factory';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorArgs, IActorTest, IAction, Mediate, TestResult } from '@comunica/core';
import { failTest, passTestVoid, Actor } from '@comunica/core';
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
  ComunicaDataFactory,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
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
export abstract class ActorQueryOperation<TS = undefined>
  extends Actor<IActionQueryOperation, IActorTest, IQueryOperationResult, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cbqo:components/BusQueryOperation.jsonld#BusQueryOperation>} bus
   *   \ @defaultNested {Query operation processing failed: none of the configured actors were able to handle the operation type ${action.operation.type}} busFailMessage
   */
  /* eslint-enable max-len */
  protected constructor(args: IActorQueryOperationArgs<TS>) {
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
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
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

    return { now, baseIRI, extensionFunctionCreator, functionArgumentsCache, dataFactory };
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
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);

    return async(expr, bindings) => {
      const operation = materializeOperation(expr.input, bindings, algebraFactory, bindingsFactory);

      const outputRaw = await mediatorQueryOperation.mediate({ operation, context });
      const output = ActorQueryOperation.getSafeBindings(outputRaw);
      return expr.not !== ((await output.bindingsStream.take(1).toArray()).length === 1);
    };
  }

  /**
   * Test if the context contains the readOnly flag.
   * @param context An action context.
   */
  public static testReadOnly(context: IActionContext): TestResult<any> {
    if (context.get(KeysQueryOperation.readOnly)) {
      return failTest(`Attempted a write operation in read-only mode`);
    }
    return passTestVoid();
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
    options?: FragmentSelectorShapeTestFlags,
  ): boolean {
    return ActorQueryOperation.doesShapeAcceptOperationRecurseShape(shape, shape, operation, options);
  }

  protected static doesShapeAcceptOperationRecurseShape(
    shapeTop: FragmentSelectorShape,
    shapeActive: FragmentSelectorShape,
    operation: Algebra.Operation,
    options?: FragmentSelectorShapeTestFlags,
  ): boolean {
    // Recurse into the shape
    if (shapeActive.type === 'conjunction') {
      return shapeActive.children
        .every(child => ActorQueryOperation.doesShapeAcceptOperationRecurseShape(shapeTop, child, operation, options));
    }
    if (shapeActive.type === 'disjunction') {
      return shapeActive.children
        .some(child => ActorQueryOperation.doesShapeAcceptOperationRecurseShape(shapeTop, child, operation, options));
    }
    if (shapeActive.type === 'arity') {
      return ActorQueryOperation.doesShapeAcceptOperationRecurseShape(shapeTop, shapeActive.child, operation, options);
    }

    // Validate options
    if ((options?.joinBindings && !shapeActive.joinBindings) ??
      (options?.filterBindings && !shapeActive.filterBindings)) {
      return false;
    }

    // Check if the shape's operation matches with the given operation
    const shapeOperation = shapeActive.operation;
    switch (shapeOperation.operationType) {
      case 'type': {
        if (!ActorQueryOperation.doesShapeAcceptOperationRecurseOperation(shapeTop, shapeActive, operation, options)) {
          return false;
        }
        return shapeOperation.type === operation.type;
      }
      case 'pattern': {
        if (!ActorQueryOperation.doesShapeAcceptOperationRecurseOperation(shapeTop, shapeActive, operation, options)) {
          return false;
        }
        return shapeOperation.pattern.type === operation.type;
      }
      case 'wildcard': {
        return true;
      }
    }
  }

  protected static doesShapeAcceptOperationRecurseOperation(
    shapeTop: FragmentSelectorShape,
    shapeActive: FragmentSelectorShape,
    operation: Algebra.Operation,
    options?: FragmentSelectorShapeTestFlags,
  ): boolean {
    // Recurse into the operation, and restart from the top-level shape
    if (operation.input) {
      const inputs: Algebra.Operation[] = Array.isArray(operation.input) ? operation.input : [ operation.input ];
      if (!inputs.every(input => ActorQueryOperation
        .doesShapeAcceptOperationRecurseShape(shapeTop, shapeTop, input, options))) {
        return false;
      }
    }
    if (operation.patterns && !operation.patterns
      .every((input: Algebra.Pattern) => ActorQueryOperation
        .doesShapeAcceptOperationRecurseShape(shapeTop, shapeTop, input, options))) {
      return false;
    }
    return true;
  }
}

export interface IActionQueryOperation extends IAction {
  /**
   * The query operation to handle.
   */
  operation: Algebra.Operation;
}

export type IActorQueryOperationArgs<TS = undefined> = IActorArgs<
  IActionQueryOperation,
IActorTest,
IQueryOperationResult,
TS
>;

export type MediatorQueryOperation = Mediate<IActionQueryOperation, IQueryOperationResult>;

export interface IBaseExpressionContext {
  now?: Date;
  baseIRI?: string;
  extensionFunctionCreator?: (functionNamedNode: RDF.NamedNode) =>
  ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined;
  functionArgumentsCache?: FunctionArgumentsCache;
  dataFactory: ComunicaDataFactory;
}

export interface ISyncExpressionContext extends IBaseExpressionContext {
  bnode: (input?: string | undefined) => RDF.BlankNode;
}

export interface IAsyncExpressionContext extends IBaseExpressionContext {
  bnode: (input?: string | undefined) => Promise<RDF.BlankNode>;
  exists?: (expr: Algebra.ExistenceExpression, bindings: Bindings) => Promise<boolean>;
}

export type FragmentSelectorShapeTestFlags = {
  joinBindings?: boolean;
  filterBindings?: boolean;
};
