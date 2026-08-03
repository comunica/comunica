import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { ICachePolicy, ILink, IQuerySource, MetadataBindings } from '@comunica/types';

/**
 * A comunica actor for query-source-dereference-link events.
 *
 * Actor types:
 * * Input:  IActionQuerySourceDereferenceLink:      The URL of a source to resolve.
 * * Test:   <none>
 * * Output: IActorQuerySourceDereferenceLinkOutput: A query source and metadata.
 *
 * @see IActionQuerySourceDereferenceLink
 * @see IActorQuerySourceDereferenceLinkOutput
 */
export abstract class ActorQuerySourceDereferenceLink<TS = undefined>
  extends Actor<IActionQuerySourceDereferenceLink, IActorTest, IActorQuerySourceDereferenceLinkOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Query source dereference link failed: none of the configured actors were able to resolve ${action.link.url}} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorQuerySourceDereferenceLinkArgs<TS>) {
    super(args);
  }
}

export interface IActionQuerySourceDereferenceLink extends IAction {
  /**
   * The link to dereference.
   */
  link: ILink;
  /**
   * A hash of all datasets that have been handled.
   */
  handledDatasets?: Record<string, boolean>;
}

export interface IActorQuerySourceDereferenceLinkOutput extends IActorOutput {
  /**
   * The new source of quads contained in the document.
   */
  source: IQuerySource;
  /**
   * Metadata about the source.
   */
  metadata: MetadataBindings;
  /**
   * The dataset that was handled.
   */
  dataset?: string;
  /**
   * The cache policy of the request's response.
   */
  cachePolicy?: ICachePolicy<IActionQuerySourceDereferenceLink>;
}

export type IActorQuerySourceDereferenceLinkArgs<TS = undefined> = IActorArgs<
IActionQuerySourceDereferenceLink,
  IActorTest,
IActorQuerySourceDereferenceLinkOutput,
TS
>;

export type MediatorQuerySourceDereferenceLink = Mediate<
IActionQuerySourceDereferenceLink,
  IActorQuerySourceDereferenceLinkOutput
>;
