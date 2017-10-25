import {ActorRdfParseFixedMediaTypes, IActionRdfParse, IActorRdfParseOutput} from "@comunica/bus-rdf-parse";
import {IActorRdfParseFixedMediaTypesArgs} from "../../bus-rdf-parse/lib/ActorRdfParseFixedMediaTypes";
// TODO: Temporarily use rdf-parser-n3, until N3 is ported to RDFJS
const N3Parser: any = require('rdf-parser-n3'); // tslint:disable-line:no-var-requires

/**
 * An N3 RDF Parse actor that listens to on the 'rdf-parse' bus.
 *
 * It is able to parse N3-based RDF serializations and announce the presence of them by media type.
 */
export class ActorRdfParseN3 extends ActorRdfParseFixedMediaTypes {

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runParse(action: IActionRdfParse): Promise<IActorRdfParseOutput> {
    return { quads: N3Parser.import(action.input) };
  }

}
