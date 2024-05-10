import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IActionContext } from '@comunica/types';

/**
 * A comunica actor for the creation of merge handlers for binding context keys.
 *
 * Actor types:
 * * Input:  IActionMergeBindingFactory: The query actionContext
 * * Test:   <none>
 * * Output: IActorMergeBindingFactoryOutput: Returns a function that merges context entries.
 *   the function only runs on contextKeys equal to the key of the returned record.
 * @see IActionMergeBindingsContext
 * @see IActorMergeBindingsContextOutput
 */

export abstract class ActorMergeBindingsContext
  extends Actor<IActionMergeBindingsContext, IActorTest, IActorMergeBindingsContextOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorMergeBindingsContextArgs) {
    super(args);
  }
}

export interface IActionMergeBindingsContext extends IAction {
  context: IActionContext;
}

export interface IActorMergeBindingsContextOutput extends IActorOutput {
  /**
   * Merge handler function created by the actor. Here the record key is the context key
   * the merge handler works on, and the value contains the constructed merge handler function
   * interface
   */
  mergeHandlers: Record<string, IBindingsContextMergeHandler<any>>;
}

export type IActorMergeBindingsContextArgs = IActorArgs<
IActionMergeBindingsContext,
IActorTest,
IActorMergeBindingsContextOutput
>;

export type MediatorMergeBindingsContext = Mediate<
IActionMergeBindingsContext,
IActorMergeBindingsContextOutput
>;

/**
 * The interface for a binding context merge handler. A merge handler is a function that accepts
 * two context entries (from different binding contexts) associated with the same key and
 * merges these two values. The merging strategy is dependent on the implementation of the
 * interface.
 * @V denotes the type associated with the context key the merge handler operates on.
 */
export interface IBindingsContextMergeHandler<V> {
  run: (...args: V[]) => V[];
}
