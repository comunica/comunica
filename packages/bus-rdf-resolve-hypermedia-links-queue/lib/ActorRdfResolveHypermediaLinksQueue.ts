import type { IAction, IActorArgs, IActorOutput, IActorTest } from '@comunica/core';
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
  public constructor(args: IActorArgs<
  IActionRdfResolveHypermediaLinksQueue, IActorTest, IActorRdfResolveHypermediaLinksQueueOutput>) {
    super(args);
  }
}

export interface IActionRdfResolveHypermediaLinksQueue extends IAction {
  firstUrl: string;
}

export interface IActorRdfResolveHypermediaLinksQueueOutput extends IActorOutput {
  linkQueue: ILinkQueue;
}
