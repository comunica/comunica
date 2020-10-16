import type { IAction, IActorArgs, IActorOutput, IActorTest, ActionContext } from '@comunica/core';
import { Actor } from '@comunica/core';
import type * as RDF from 'rdf-js';

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
  public constructor(args:
  IActorArgs<IActionRdfResolveHypermediaLinks, IActorTest, IActorRdfResolveHypermediaLinksOutput>) {
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
  urls: (string | ILink)[];
}

/**
 * A link holder that can expose additional properties.
 */
export interface ILink {
  /**
   * The URL identifying this link.
   */
  url: string;
  /**
   * An optional stream modifier.
   * This transformation will be applied on the stream of data quads that is obtained from dereferencing the given URL.
   * @param input The stream of data quads on the given URL.
   * @returns The stream of data quads to be used for this link instead of the given stream.
   */
  transform?: (input: RDF.Stream) => Promise<RDF.Stream>;
  /**
   * Optional context to apply onto mediators when handling this link as source.
   * All entries of this context will be added (or overwritten) into the existing context.
   */
  context?: ActionContext;
}
