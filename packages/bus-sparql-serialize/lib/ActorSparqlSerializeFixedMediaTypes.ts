import type { IActorArgsMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import { ActorAbstractMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import type { IActorTest } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { IActionSparqlSerialize, IActorSparqlSerializeOutput,
  ActorSparqlSerialize } from './ActorSparqlSerialize';

/**
 * A base actor for listening to SPARQL serialize events that has fixed media types.
 *
 * Actor types:
 * * Input:  IActionSparqlSerializeOrMediaType:      A serialize input or a media type input.
 * * Test:   <none>
 * * Output: IActorSparqlSerializeOutputOrMediaType: The serialized quads.
 *
 * @see IActionInit
 */
export abstract class ActorSparqlSerializeFixedMediaTypes extends ActorAbstractMediaTypedFixed<
IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput>
  implements IActorSparqlSerializeFixedMediaTypesArgs, ActorSparqlSerialize {
  /* eslint-disable max-len */
  /**
   * TODO: rm this (and eslint-disable) once we remove the abstract media typed actor
   * @param args - @defaultNested {<cbss:components/ActorSparqlSerialize.jsonld#ActorSparqlSerialize_default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }
  /* eslint-enable max-len */

  public async testHandleChecked(action: IActionSparqlSerialize, context: IActionContext): Promise<boolean> {
    return true;
  }
}

export interface IActorSparqlSerializeFixedMediaTypesArgs
  extends IActorArgsMediaTypedFixed<IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput> {}
