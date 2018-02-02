import {ActorAbstractMediaTypedFixed, IActorArgsMediaTypedFixed} from "@comunica/actor-abstract-mediatyped";
import {IActorTest} from "@comunica/core";
import {IActionRdfParse, IActorRdfParseOutput,
} from "./ActorRdfParse";

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
export abstract class ActorRdfParseFixedMediaTypes extends ActorAbstractMediaTypedFixed<
  IActionRdfParse, IActorTest, IActorRdfParseOutput> implements IActorRdfParseFixedMediaTypesArgs {

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async testHandleChecked(action: IActionRdfParse) {
    return true;
  }

}

export interface IActorRdfParseFixedMediaTypesArgs
  extends IActorArgsMediaTypedFixed<IActionRdfParse, IActorTest, IActorRdfParseOutput> {}
