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

  public async testHandle(action: IActionRdfParse, mediaType: string, context: ActionContext): Promise<IActorTest> {
    if (!(mediaType in this.mediaTypes) && !mediaType.endsWith('+json')) {
      throw new Error('Unrecognized media type: ' + mediaType);
    }
    return await this.testHandleChecked(action);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, actionContext: ActionContext)
    : Promise<IActorRdfParseOutput> {
    const parser = JsonLdParser.fromHttpResponse(action.baseIRI, mediaType, action.headers, {
      documentLoader: new DocumentLoaderMediated(this.mediatorHttp, actionContext),
    });
    const quads: RDF.Stream = parser.import(action.input);
    return { quads };
  }

}

export interface IActorRdfParseJsonLdArgs extends IActorRdfParseFixedMediaTypesArgs {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
}
