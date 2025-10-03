import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IQuerySource, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica actor for query-source-hypermedia-resolve events.
 *
 * Actor types:
 * * Input:  IActionQuerySourceHypermediaResolve:      The URL of a source to resolve.
 * * Test:   <none>
 * * Output: IActorQuerySourceHypermediaResolveOutput: A query source and metadata.
 *
 * @see IActionQuerySourceHypermediaResolve
 * @see IActorQuerySourceHypermediaResolveOutput
 */
export abstract class ActorQuerySourceHypermediaResolve<TS = undefined>
  extends Actor<IActionQuerySourceHypermediaResolve, IActorTest, IActorQuerySourceHypermediaResolveOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Query source hypermedia resolution failed: none of the configured actors were able to resolve ${action.url}} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorQuerySourceHypermediaResolveArgs<TS>) {
    super(args);
  }
}

export interface IActionQuerySourceHypermediaResolve extends IAction {
  /**
   * The URL to resolve for.
   */
  url: string;
  /**
   * If a source type must be forced.
   */
  forceSourceType?: string;
  /**
   * A hash of all datasets that have been handled.
   */
  handledDatasets?: Record<string, boolean>;
  /**
   * Transformation to apply on the quads right after resolving.
   * @param input The resolved quads.
   * @param metadata The metadata discovered during resolution.
   */
  transformQuads?: (input: RDF.Stream, metadata: MetadataBindings) => Promise<RDF.Stream>;
}

export interface IActorQuerySourceHypermediaResolveOutput extends IActorOutput {
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
}

export type IActorQuerySourceHypermediaResolveArgs<TS = undefined> = IActorArgs<
IActionQuerySourceHypermediaResolve,
  IActorTest,
IActorQuerySourceHypermediaResolveOutput,
TS
>;

export type MediatorQuerySourceHypermediaResolve = Mediate<
IActionQuerySourceHypermediaResolve,
  IActorQuerySourceHypermediaResolveOutput
>;
