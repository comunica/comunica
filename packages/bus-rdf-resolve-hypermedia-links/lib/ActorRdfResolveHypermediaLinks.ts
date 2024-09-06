import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { ILink } from '@comunica/types';

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
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfResolveHypermediaLinksArgs) {
    super(args);
  }
}

export interface IActionRdfResolveHypermediaLinks extends IAction {
  /**
   * The metadata from which the links should be extracted.
   */
  metadata: Record<string, any>;
}

export interface IActorRdfResolveHypermediaLinksOutput extends IActorOutput {
  /**
   * An array of links to follow.
   */
  links: ILink[];
}

// TODO remove this in next major version
export { ILink } from '@comunica/types';

export type IActorRdfResolveHypermediaLinksArgs = IActorArgs<
IActionRdfResolveHypermediaLinks,
IActorTest,
IActorRdfResolveHypermediaLinksOutput
>;

export type MediatorRdfResolveHypermediaLinks = Mediate<
IActionRdfResolveHypermediaLinks,
IActorRdfResolveHypermediaLinksOutput
>;
