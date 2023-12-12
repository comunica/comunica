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
 * @see IActionMergeBindingFactory
 * @see IActorMergeBindingFactoryOutput
 */

export abstract class ActorMergeBindingFactory extends Actor<IActionMergeBindingFactory,
IActorTest,
IActorMergeBindingFactoryOutput> {
  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  public constructor(args: IActorMergeBindingFactoryArgs) {
    super(args);
  }
}

export interface IActionMergeBindingFactory extends IAction {
  context: IActionContext;
}

export interface IActorMergeBindingFactoryOutput extends IActorOutput {
  /**
   * Merge handler function created by the actor. Here the record key is the context key
   * the merge handler works on, and the value contains the constructed merge handler function
   * interface
   */
  mergeHandlers: Record<string, IMergeHandler<any>>;
}

export type IActorMergeBindingFactoryArgs = IActorArgs<
IActionMergeBindingFactory, IActorTest, IActorMergeBindingFactoryOutput>;

export type MediatorMergeBindingFactory = Mediate<
IActionMergeBindingFactory, IActorMergeBindingFactoryOutput>;

/**
 * The interface for a binding context merge handler. Given two context key entries,
 * the merge handler executes run and returns the merged result. Different actors implement different
 * merge functions.
 * @V denotes the type associated with the context key the merge handler operates on.
 */
export interface IMergeHandler<V> {
  run: (...args: V[]) => V[];
}

