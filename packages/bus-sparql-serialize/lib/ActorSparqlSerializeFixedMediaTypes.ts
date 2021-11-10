/* eslint-disable max-len */
import type { IActorArgsMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import { ActorAbstractMediaTypedFixed } from '@comunica/actor-abstract-mediatyped';
import type { ActionContext, IActorTest } from '@comunica/core';
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
  /**
   * TODO: rm this (and eslint-disable) once we remove the abstract media typed actor
   * @param args - @defaultNested {<cbss:lib/ActorSparqlSerialize#ActorSparqlSerialize_default_bus> a <cc:lib/Bus#Bus>} bus
   */
  public constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: ActionContext): Promise<boolean> {
    return true;
  }
}

export interface IActorSparqlSerializeFixedMediaTypesArgs
  extends IActorArgsMediaTypedFixed<IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput> {}
