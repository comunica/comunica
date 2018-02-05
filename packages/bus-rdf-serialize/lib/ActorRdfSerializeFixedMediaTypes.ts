import {ActorAbstractMediaTypedFixed, IActorArgsMediaTypedFixed} from "@comunica/actor-abstract-mediatyped";
import {IActorTest} from "@comunica/core";
import {
  IActionRdfSerialize, IActorRdfSerializeOutput,
} from "./ActorRdfSerialize";

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
  IActionRdfSerialize, IActorTest, IActorRdfSerializeOutput> implements IActorRdfSerializeFixedMediaTypesArgs {

  constructor(args: IActorRdfSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async testHandleChecked(action: IActionRdfSerialize) {
    return true;
  }

}

export interface IActorRdfSerializeFixedMediaTypesArgs
  extends IActorArgsMediaTypedFixed<IActionRdfSerialize, IActorTest, IActorRdfSerializeOutput> {}
