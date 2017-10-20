import {ActorRdfParse, IActionRdfParse, IActorRdfParseOutput} from "@comunica/bus-rdf-parse";
import {IActorTest} from "@comunica/core";
import {IActorArgs} from "@comunica/core/lib/Actor";
// TODO: Temporarily use rdf-parser-n3, until N3 is ported to RDFJS
const N3Parser: any = require('rdf-parser-n3'); // tslint:disable-line:no-var-requires

/**
 * An N3 RDF Parse actor that listens to on the 'rdf-parse' bus.
 *
 * It is able to parse N3-based RDF serializations.
 */
export class ActorRdfParseN3 extends ActorRdfParse {

  public static MEDIA_TYPES: string[] = [
    'application/trig',
    'application/n-quads',
    'text/turtle',
    'application/n-triples',
  ];

  constructor(args: IActorArgs<IActionRdfParse, IActorTest, IActorRdfParseOutput>) {
    super(args);
  }

  public async test(action: IActionRdfParse): Promise<IActorTest> {
    if (ActorRdfParseN3.MEDIA_TYPES.indexOf(action.mediaType) < 0) {
      throw new Error('Unrecognized media type');
    }
    return true;
  }

  public async run(action: IActionRdfParse): Promise<IActorRdfParseOutput> {
    return { quads: N3Parser.import(action.input) };
  }

}
