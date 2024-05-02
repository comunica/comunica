import { HashFunction } from '@comunica/bus-hash-bindings';
import { Actor, IAction, IActorArgs, IActorOutput, IActorTest, Mediate, Mediator } from '@comunica/core';

/**
 * A comunica actor for hash-quads events.
 *
 * Actor types:
 * * Input:  IActionHashQuads:      Metadata for selecting a hash function.
 * * Test:   <none>
 * * Output: IActorHashQuadsOutput: The resulting hash function.
 *
 * @see IActionHashQuads
 * @see IActorHashQuadsOutput
 */
export abstract class ActorHashQuads extends Actor<IActionHashQuads, IActorTest, IActorHashQuadsOutput> {
  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  public constructor(args: IActorHashQuadsArgs) {
    super(args);
  }
}

export interface IActionHashQuads extends IAction {
  /**
   * If hash collisions are allowed.
   */
  allowHashCollisions: boolean;
}

export interface IActorHashQuadsOutput extends IActorOutput {
  /**
   * A string-based hash of the given object.
   * @param {Bindings} bindings The bindings to hash.
   * @return {string} The object's hash.
   */
  hashFunction: HashFunction; //TODO not sure if I should import from hashBindings

  /**
  * If hash collisions are possible with the given hash function.
  */
  hashCollisions: boolean;
}

export type IActorHashQuadsArgs = IActorArgs<
IActionHashQuads, IActorTest, IActorHashQuadsOutput>;

export type MediatorHashQuads = Mediator<
Actor<IActionHashQuads, IActorTest, IActorHashQuadsOutput>,
IActionHashQuads,
IActorTest,
IActorHashQuadsOutput
>;
