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
  actionContext: IActionContext;
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
