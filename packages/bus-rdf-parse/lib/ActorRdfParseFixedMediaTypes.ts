import type { IActorArgsMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import { ActorAbstractParseFixedMediaTypes } from '@comunica/actor-abstract-parse';
import type { IActorTest } from '@comunica/core';
import type { IActionRdfParse, IActorRdfParseOutput } from './ActorRdfParse';

/**
 * A base actor for listening to RDF parse events that has fixed media types.
 *
 * Actor types:
 * * Input:  IActionRdfParseOrMediaType:      A parse input or a media type input.
 * * Test:   <none>
 * * Output: IActorOutputRdfParseOrMediaType: The parsed quads.
 *
 * @see IActionInit
 */
export abstract class ActorRdfParseFixedMediaTypes extends
  ActorAbstractParseFixedMediaTypes<IActionRdfParse, IActorRdfParseOutput> {
  /* eslint-disable max-len */
  /**
   * TODO: rm this (and eslint-disable) once we remove the abstract media typed actor
   * @param args - @defaultNested {<cbrp:components/ActorRdfParse.jsonld#ActorRdfParse_default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }
  /* eslint-enable max-len */
}

export type IActorRdfParseFixedMediaTypesArgs = IActorArgsMediaTypedFixed<
IActionRdfParse, IActorTest, IActorRdfParseOutput>;
