import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { Bindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

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

/**
 * The action input for selecting a bindings hash function.
 */
export interface IActionHashBindings extends IAction {
}

export interface IActorHashBindingsOutput extends IActorOutput {
  /**
   * A number-based hash factory of the given object.
   * It is recommended to always return 32-bit numbers to enable SMI optimization.
   *
   * Hash functions could produce collisions for non-equal bindings.
   *
   * @param {Bindings} bindings The bindings to hash.
   * @return {string} The object's hash.
   */
  hashFunction: HashFunction;
}

/**
 * A function that hashes bindings to a number.
 */
export type HashFunction = (bindings: Bindings, variables: Iterable<RDF.Variable>) => number;

/**
 * Constructor arguments for {@link ActorHashBindings}.
 */
export type IActorHashBindingsArgs<TS = undefined> =
  IActorArgs<IActionHashBindings, IActorTest, IActorHashBindingsOutput, TS>;

/**
 * A mediator type for hash bindings actors.
 */
export type MediatorHashBindings = Mediate<IActionHashBindings, IActorHashBindingsOutput>;
