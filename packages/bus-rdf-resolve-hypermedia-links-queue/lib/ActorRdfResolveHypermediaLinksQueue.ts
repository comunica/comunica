import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { ILinkQueue } from './ILinkQueue';

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
export abstract class ActorRdfResolveHypermediaLinksQueue extends
  Actor<IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfResolveHypermediaLinksQueueArgs) {
    super(args);
  }
}

export interface IActionRdfResolveHypermediaLinksQueue extends IAction {
  firstUrl: string;
}

export interface IActorRdfResolveHypermediaLinksQueueOutput extends IActorOutput {
  linkQueue: ILinkQueue;
}

export type IActorRdfResolveHypermediaLinksQueueArgs = IActorArgs<
IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput>;

export type MediatorRdfResolveHypermediaLinksQueue = Mediate<
IActionRdfResolveHypermediaLinksQueue, IActorRdfResolveHypermediaLinksQueueOutput>;
