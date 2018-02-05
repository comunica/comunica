import {ActorAbstractMediaTypedFixed, IActorArgsMediaTypedFixed} from "@comunica/actor-abstract-mediatyped";
import {IActorTest} from "@comunica/core";
import {
  IActionSparqlSerialize, IActorSparqlSerializeOutput,
} from "./ActorSparqlSerialize";

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
  IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput> implements IActorSparqlSerializeFixedMediaTypesArgs {

  constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async testHandleChecked(action: IActionSparqlSerialize) {
    return true;
  }

}

export interface IActorSparqlSerializeFixedMediaTypesArgs
  extends IActorArgsMediaTypedFixed<IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput> {}
