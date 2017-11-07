import {ActorRdfParseFixedMediaTypes, IActionRdfParse, IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput} from "@comunica/bus-rdf-parse";
// TODO: Temporarily use rdf-parser-n3, until N3 is ported to RDFJS
const N3Parser: any = require('rdf-parser-n3'); // tslint:disable-line:no-var-requires

/**
 * An N3 RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to parse N3-based RDF serializations and announce the presence of them by media type.
 */
export class ActorRdfParseN3 extends ActorRdfParseFixedMediaTypes {

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runParse(action: IActionRdfParse): Promise<IActorRdfParseOutput> {
    return {
      quads: N3Parser.import(action.input),
      triples: action.mediaType === 'text/turtle'
      || action.mediaType === 'application/n-triples'
      || action.mediaType === 'text/n3',
    };
  }

}
