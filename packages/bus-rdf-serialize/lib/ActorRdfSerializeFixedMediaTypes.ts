import type { IActorArgsMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import { ActorAbstractMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { IActionRdfSerialize, IActorRdfSerializeOutput, ActorRdfSerialize } from './ActorRdfSerialize';

/**
 * A base actor for listening to RDF serialize events that has fixed media types.
 *
 * Actor types:
 * * Input:  IActionRdfSerializeOrMediaType:      A serialize input or a media type input.
 * * Test:   <none>
 * * Output: IActorRdfSerializeOutputOrMediaType: The serialized quads.
 *
 * @see IActionInit
 */
export abstract class ActorRdfSerializeFixedMediaTypes extends ActorAbstractMediaTypedFixed<
IActionRdfSerialize,
IActorTest,
IActorRdfSerializeOutput
>
  implements IActorRdfSerializeFixedMediaTypesArgs, ActorRdfSerialize {
  /* eslint-disable max-len */
  /**
   * TODO: rm this (and eslint-disable) once we remove the abstract media typed actor
   * @param args -
   *   \ @defaultNested {<cbrs:components/ActorRdfSerialize.jsonld#ActorRdfSerialize_default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {RDF serialization failed: none of the configured serializers were able to handle media type ${action.handleMediaType}} busFailMessage
   */
  public constructor(args: IActorRdfSerializeFixedMediaTypesArgs) {
    super(args);
  }
  /* eslint-enable max-len */

  public async testHandleChecked(): Promise<TestResult<boolean>> {
    return passTestVoid();
  }
}

export type IActorRdfSerializeFixedMediaTypesArgs = IActorArgsMediaTypedFixed<
IActionRdfSerialize,
IActorTest,
IActorRdfSerializeOutput
>;
