import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IQuadUpdate } from '@comunica/types';

/**
 * A comunica actor for rdf-update-quads events.
 *
 * Actor types:
 * * Input:  IActionRdfUpdateQuads:      Quad insertion and deletion streams.
 * * Test:   <none>
 * * Output: IActorRdfUpdateQuadsOutput: A promise resolving when the update operation is done.
 *
 * @see IActionRdfUpdateQuads
 * @see IActorRdfUpdateQuadsOutput
 */
export abstract class ActorRdfUpdateQuads<TS = undefined>
  extends Actor<IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {RDF updating failed: none of the configured actors were able to handle an update} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorRdfUpdateQuadsArgs<TS>) {
    super(args);
  }
}

export interface IActionRdfUpdateQuads extends IAction, IQuadUpdate {}

export interface IActorRdfUpdateQuadsOutput extends IActorOutput {
  /**
   * Async function that resolves when the update operation is done.
   */
  execute: () => Promise<void>;
}

export type IActorRdfUpdateQuadsArgs<TS = undefined> =
  IActorArgs<IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput, TS>;

export type MediatorRdfUpdateQuads = Mediate<IActionRdfUpdateQuads, IActorRdfUpdateQuadsOutput>;
