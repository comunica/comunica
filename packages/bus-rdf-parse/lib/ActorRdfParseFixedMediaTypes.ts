import type { IActorArgsMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import { ActorAbstractMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
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
  ActorAbstractMediaTypedFixed<IActionRdfParse, IActorTest, IActorRdfParseOutput> {
  /* eslint-disable max-len */
  /**
   * TODO: rm this (and eslint-disable) once we remove the abstract media typed actor
   * @param args - @defaultNested {<cbrp:components/ActorRdfParse.jsonld#ActorRdfParse_default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }
  /* eslint-enable max-len */

  public async testHandleChecked(action: IActionRdfParse): Promise<boolean> {
    return true;
  }
}

export type IActorRdfParseFixedMediaTypesArgs = IActorArgsMediaTypedFixed<
IActionRdfParse, IActorTest, IActorRdfParseOutput>;
