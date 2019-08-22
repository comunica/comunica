import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {ActorRdfParseFixedMediaTypes, IActionRdfParse,
  IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput} from "@comunica/bus-rdf-parse";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import {JsonLdParser} from "jsonld-streaming-parser";
import * as RDF from "rdf-js";
import {DocumentLoaderMediated} from "./DocumentLoaderMediated";

/**
 * A JSON-LD RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to parse JSON-LD-based RDF serializations and announce the presence of them by media type.
 */
export class ActorRdfParseJsonLd extends ActorRdfParseFixedMediaTypes {

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;

  constructor(args: IActorRdfParseJsonLdArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext)
    : Promise<IActorRdfParseOutput> {
    const quads: RDF.Stream = <any> new JsonLdParser({
      allowOutOfOrderContext: true,
      baseIRI: action.baseIRI,
      documentLoader: new DocumentLoaderMediated(this.mediatorHttp, context),
    }).import(action.input);
    return { quads };
  }

}

export interface IActorRdfParseJsonLdArgs extends IActorRdfParseFixedMediaTypesArgs {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
}
