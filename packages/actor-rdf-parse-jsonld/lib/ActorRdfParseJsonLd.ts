import {ActorRdfParseFixedMediaTypes, IActionRdfParse,
  IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput} from "@comunica/bus-rdf-parse";
import {ActionContext} from "@comunica/core";
const JsonLdParser: any = require('rdf-parser-jsonld'); // tslint:disable-line:no-var-requires

/**
 * A JSON-LD RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to parse JSON-LD-based RDF serializations and announce the presence of them by media type.
 */
export class ActorRdfParseJsonLd extends ActorRdfParseFixedMediaTypes {

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext)
    : Promise<IActorRdfParseOutput> {
    return { quads: JsonLdParser.import(action.input) };
  }

}
