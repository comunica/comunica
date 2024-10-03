import type { IActorArgsMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import { ActorAbstractMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
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
   * @param args -
   *   \ @defaultNested {<cbrp:components/ActorRdfParse.jsonld#ActorRdfParse_default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {RDF parsing failed: none of the configured parsers were able to handle the media type ${action.handle.mediaType} for ${action.handle.url}} busFailMessage
   */
  public constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }
  /* eslint-enable max-len */

  public async testHandleChecked(_action: IActionRdfParse): Promise<TestResult<boolean>> {
    return passTestVoid();
  }
}

export type IActorRdfParseFixedMediaTypesArgs = IActorArgsMediaTypedFixed<
IActionRdfParse,
IActorTest,
IActorRdfParseOutput
>;
