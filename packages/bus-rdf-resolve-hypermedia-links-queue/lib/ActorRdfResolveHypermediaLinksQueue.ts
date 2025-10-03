import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { ILinkQueue } from '@comunica/types';

/**
 * A comunica actor for rdf-resolve-hypermedia-links-queue events.
 *
 * Actor types:
 * * Input:  IActionRdfResolveHypermediaLinksQueue:      Creates a new {@link ILinkQueue} for the given seed URL.
 * * Test:   <none>
 * * Output: IActorRdfResolveHypermediaLinksQueueOutput: The created {@link ILinkQueue}.
 *
 * @see IActionRdfResolveHypermediaLinksQueue
 * @see IActorRdfResolveHypermediaLinksQueueOutput
 */
export abstract class ActorRdfResolveHypermediaLinksQueue<TS = undefined> extends
  Actor<IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Link queue creation failed: none of the configured actors were able to create a link queue} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorRdfResolveHypermediaLinksQueueArgs<TS>) {
    super(args);
  }
}

export interface IActionRdfResolveHypermediaLinksQueue extends IAction {

}

export interface IActorRdfResolveHypermediaLinksQueueOutput extends IActorOutput {
  linkQueue: ILinkQueue;
}

export type IActorRdfResolveHypermediaLinksQueueArgs<TS = undefined> = IActorArgs<
IActionRdfResolveHypermediaLinksQueue,
IActorTest,
IActorRdfResolveHypermediaLinksQueueOutput,
TS
>;

export type MediatorRdfResolveHypermediaLinksQueue = Mediate<
IActionRdfResolveHypermediaLinksQueue,
IActorRdfResolveHypermediaLinksQueueOutput
>;
