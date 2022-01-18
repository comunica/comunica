import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediator } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { Bindings } from '@comunica/types';

/**
 * A comunica actor for hash-bindings events.
 *
 * Actor types:
 * * Input:  IActionHashBindings:      Metadata for selecting a hash function.
 * * Test:   IActorTest:
 * * Output: IActorHashBindingsOutput: The resulting hash function.
 *
 * @see IActionHashBindings
 * @see IActorHashBindingsTest
 * @see IActorHashBindingsOutput
 */
export abstract class ActorHashBindings
  extends Actor<IActionHashBindings, IActorTest, IActorHashBindingsOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorHashBindingsArgs) {
    super(args);
  }
}

export interface IActionHashBindings extends IAction {
  /**
   * If hash collisions are allowed.
   */
  allowHashCollisions: boolean;
}

export interface IActorHashBindingsOutput extends IActorOutput {
  /**
   * A string-based hash of the given object.
   * @param {Bindings} bindings The bindings to hash.
   * @return {string} The object's hash.
   */
  hashFunction: HashFunction;

  /**
   * If hash collisions are possible with the given hash function.
   */
  hashCollisions: boolean;
}

export type HashFunction = (bindings: Bindings) => string;

export type IActorHashBindingsArgs = IActorArgs<IActionHashBindings, IActorTest, IActorHashBindingsOutput>;

export type MediatorHashBindings = Mediator<
Actor<IActionHashBindings, IActorTest, IActorHashBindingsOutput>,
IActionHashBindings, IActorTest, IActorHashBindingsOutput>;
