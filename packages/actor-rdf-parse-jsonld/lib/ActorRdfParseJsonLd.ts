import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {ActorRdfParseFixedMediaTypes, IActionRdfParse,
  IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput} from "@comunica/bus-rdf-parse";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import {parse as parseLinkHeader} from "http-link-header";
import {JsonLdContext} from "jsonld-context-parser";
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

  public static newErrorCoded(message: string, code: string) {
    const error = new Error(message);
    (<any> error).code = code;
    return error;
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, actionContext: ActionContext)
    : Promise<IActorRdfParseOutput> {
    // Try to extract a JSON-LD context link header (https://w3c.github.io/json-ld-syntax/#interpreting-json-as-json-ld)
    let context: JsonLdContext;
    if (mediaType !== 'application/ld+json') {
      if (action.headers && action.headers.has('Link')) {
        const linkHeader = parseLinkHeader(action.headers.get('Link'));
        for (const link of linkHeader.get('rel', 'http://www.w3.org/ns/json-ld#context')) {
          if (link.type === 'application/ld+json') {
            if (context) {
              throw ActorRdfParseJsonLd.newErrorCoded(
                'Multiple JSON-LD context link headers were found on ' + action.baseIRI,
                'multiple context link headers');
            }
            context = link.uri;
          }
        }
      }
      if (!context) {
        throw ActorRdfParseJsonLd.newErrorCoded(`Missing context link header for media type ${mediaType} on ${action.baseIRI}`,
          'loading document failed');
      }
    }

    // Parse the JSON-LD
    const quads: RDF.Stream = <any> new JsonLdParser({
      baseIRI: action.baseIRI,
      context,
      documentLoader: new DocumentLoaderMediated(this.mediatorHttp, actionContext),
    }).import(action.input);

    return { quads };
  }

}

export interface IActorRdfParseJsonLdArgs extends IActorRdfParseFixedMediaTypesArgs {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
}
