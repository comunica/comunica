import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IActionContext } from '@comunica/types';

/**
 * A comunica actor for the creation of merge handlers for binding context keys.
 *
 * Actor types:
 * * Input:  IActionMergeBindingFactory:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorMergeBindingFactoryOutput: TODO: fill in.
 *
 * @see IActionMergeBindingFactory
 * @see IActorMergeBindingFactoryOutput
 */

export abstract class ActorMergeBindingFactory extends Actor<IActionMergeBindingFactory, IActorTest, IActorMergeBindingFactoryOutput> {
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
  mergeHandlers: Record<string, Function>;
}

export type IActorMergeBindingFactoryArgs = IActorArgs<
IActionMergeBindingFactory, IActorTest, IActorMergeBindingFactoryOutput>;

export type MediatorMergeBindingFactory = Mediate<
IActionMergeBindingFactory, IActorMergeBindingFactoryOutput>;
