import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";

/**
 * A comunica actor for rdf-resolve-hypermedia-links events.
 *
 * Actor types:
 * * Input:  IActionRdfResolveHypermediaLinks:      The metadata from which the links should be extracted.
 * * Test:   <none>
 * * Output: IActorRdfResolveHypermediaLinksOutput: The URLs that were detected.
 *
 * @see IActionRdfResolveHypermediaLinks
 * @see IActorRdfResolveHypermediaLinksOutput
 */
export abstract class ActorRdfResolveHypermediaLinks
  extends Actor<IActionRdfResolveHypermediaLinks, IActorTest, IActorRdfResolveHypermediaLinksOutput> {

  constructor(args: IActorArgs<IActionRdfResolveHypermediaLinks, IActorTest, IActorRdfResolveHypermediaLinksOutput>) {
    super(args);
  }

}

export interface IActionRdfResolveHypermediaLinks extends IAction {
  /**
   * The metadata from which the links should be extracted.
   */
  metadata: {[id: string]: any};
}

export interface IActorRdfResolveHypermediaLinksOutput extends IActorOutput {
  /**
   * An array of links to follow.
   */
  urls: string[];
}
