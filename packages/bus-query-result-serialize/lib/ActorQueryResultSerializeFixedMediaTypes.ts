import type { IActorArgsMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import { ActorAbstractMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import type { IActorTest } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { IActionSparqlSerialize, IActorQueryResultSerializeOutput,
  ActorQueryResultSerialize } from './ActorQueryResultSerialize';

/**
 * A base actor for listening to SPARQL serialize events that has fixed media types.
 *
 * Actor types:
 * * Input:  IActionSparqlSerializeOrMediaType:      A serialize input or a media type input.
 * * Test:   <none>
 * * Output: IActorQueryResultSerializeOutputOrMediaType: The serialized quads.
 *
 * @see IActionInit
 */
export abstract class ActorQueryResultSerializeFixedMediaTypes extends ActorAbstractMediaTypedFixed<
IActionSparqlSerialize, IActorTest, IActorQueryResultSerializeOutput>
  implements IActorQueryResultSerializeFixedMediaTypesArgs, ActorQueryResultSerialize {
  /* eslint-disable max-len */
  /**
   * TODO: rm this (and eslint-disable) once we remove the abstract media typed actor
   * @param args - @defaultNested {<cbqrs:components/ActorQueryResultSerialize.jsonld#ActorQueryResultSerialize_default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorQueryResultSerializeFixedMediaTypesArgs) {
    super(args);
  }
  /* eslint-enable max-len */

  public async testHandleChecked(action: IActionSparqlSerialize, context: IActionContext): Promise<boolean> {
    return true;
  }
}

export interface IActorQueryResultSerializeFixedMediaTypesArgs
  extends IActorArgsMediaTypedFixed<IActionSparqlSerialize, IActorTest, IActorQueryResultSerializeOutput> {}
