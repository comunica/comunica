import {ActorRdfParseFixedMediaTypes, IActionRdfParse, IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput} from "@comunica/bus-rdf-parse";
import {ActionContext} from "@comunica/core";
import {RdfaParser} from "rdfa-streaming-parser";

/**
 * A comunica XML RDFa RDF Parse Actor.
 */
export class ActorRdfParseXmlRdfa extends ActorRdfParseFixedMediaTypes {

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext)
    : Promise<IActorRdfParseOutput> {
    const language = action.headers ? action.headers.get('content-language') : null;
    action.input.on('error', (e) => quads.emit('error', e));
    const quads = action.input.pipe(new RdfaParser({ baseIRI: action.baseIRI, profile: 'xml', language }));
    return { quads, triples: true };
  }

}
