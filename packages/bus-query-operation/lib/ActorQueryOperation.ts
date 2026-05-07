import type { IActorArgs, IActorTest, IAction, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type {
  IQueryOperationResult,
  Bindings,
  IActionContext,
  FunctionArgumentsCache,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

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
}

export interface IActionQueryOperation extends IAction {
  /**
   * The query operation to handle.
   */
  operation: Algebra.Operation;
}

/**
 * Constructor arguments for {@link ActorQueryOperation}.
 * @template TS The test side-data type.
 */
export type IActorQueryOperationArgs<TS = undefined> = IActorArgs<
  IActionQueryOperation,
IActorTest,
IQueryOperationResult,
TS
>;

/**
 * Mediator type for query operation actors.
 */
export type MediatorQueryOperation = Mediate<IActionQueryOperation, IQueryOperationResult>;

/**
 * Base context for SPARQL expression evaluation.
 */
export interface IBaseExpressionContext {
  /**
   * The current date/time for evaluation.
   */
  now?: Date;
  /**
   * The base IRI for resolving relative IRIs.
   */
  baseIRI?: string;
  /**
   * Factory for creating custom extension functions from named nodes.
   */
  extensionFunctionCreator?: (functionNamedNode: RDF.NamedNode) =>
  ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined;
  /**
   * Cache for function argument types.
   */
  functionArgumentsCache?: FunctionArgumentsCache;
  /**
   * The action context for the current query.
   */
  actionContext: IActionContext;
}

/**
 * Synchronous expression evaluation context.
 */
export interface ISyncExpressionContext extends IBaseExpressionContext {
  /**
   * Creates a blank node synchronously.
   */
  bnode: (input?: string | undefined) => RDF.BlankNode;
}

/**
 * Asynchronous expression evaluation context.
 */
export interface IAsyncExpressionContext extends IBaseExpressionContext {
  /**
   * Creates a blank node asynchronously.
   */
  bnode: (input?: string | undefined) => Promise<RDF.BlankNode>;
  /**
   * Evaluates an EXISTS expression against bindings.
   */
  exists?: (expr: Algebra.ExistenceExpression, bindings: Bindings) => Promise<boolean>;
}

/**
 * Flags for fragment selector shape testing.
 */
export type FragmentSelectorShapeTestFlags = {
  /**
   * Whether join bindings are requested.
   */
  joinBindings?: boolean;
  /**
   * Whether filter bindings are requested.
   */
  filterBindings?: boolean;
};
