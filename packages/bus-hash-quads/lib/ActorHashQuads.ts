import { Actor } from '@comunica/core';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import type { Quad } from 'rdf-data-factory';

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
export abstract class ActorHashQuads<TS = undefined>
  extends Actor<IActionHashQuads, IActorTest, IActorHashQuadsOutput, TS> {
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Failed to obtaining hash functions for quads} busFailMessage
   */
  public constructor(args: IActorHashQuadsArgs<TS>) {
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
   * @param {Quads} quads The quads to hash.
   * @return {string} The object's hash.
   */
  hashFunction: HashFunction;

  /**
   * If hash collisions are possible with the given hash function.
   */
  hashCollisions: boolean;
}

export type HashFunction = (quad: Quad) => string;

export type IActorHashQuadsArgs<TS = undefined> = IActorArgs<
IActionHashQuads,
IActorTest,
IActorHashQuadsOutput,
TS
>;

export type MediatorHashQuads = Mediate<IActionHashQuads, IActorHashQuadsOutput>;
