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
}

export interface IActorHashQuadsOutput extends IActorOutput {
  /**
   * A number-based hash factory of the given object.
   * It is recommended to always return 32-bit numbers to enable SMI optimization.
   *
   * Hash functions could produce collisions for non-equal quads.
   *
   * @param {RDF.Quad} quads The quads to hash.
   * @return {string} The object's hash.
   */
  hashFunction: HashFunction;
}

export type HashFunction = (quad: Quad) => number;

export type IActorHashQuadsArgs<TS = undefined> = IActorArgs<
IActionHashQuads,
IActorTest,
IActorHashQuadsOutput,
TS
>;

export type MediatorHashQuads = Mediate<IActionHashQuads, IActorHashQuadsOutput>;
