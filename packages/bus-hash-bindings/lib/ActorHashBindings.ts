import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
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
export abstract class ActorHashBindings<TS = undefined>
  extends Actor<IActionHashBindings, IActorTest, IActorHashBindingsOutput, TS> {
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Failed to obtaining hash functions for bindings} busFailMessage
   */
  public constructor(args: IActorHashBindingsArgs<TS>) {
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

export type IActorHashBindingsArgs<TS = undefined> =
  IActorArgs<IActionHashBindings, IActorTest, IActorHashBindingsOutput, TS>;

export type MediatorHashBindings = Mediate<IActionHashBindings, IActorHashBindingsOutput>;
