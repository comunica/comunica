import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorArgs, IActorTest, IAction, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type {
  IQueryOperationResult,
  Bindings,
  IActionContext,
  FunctionArgumentsCache,
  ComunicaDataFactory,
} from '@comunica/types';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { BlankNodeBindingsScoped } from '@comunica/utils-data-factory';
import { getSafeBindings, materializeOperation } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

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
      const output = getSafeBindings(outputRaw);
      return expr.not !== ((await output.bindingsStream.take(1).toArray()).length === 1);
    };
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
