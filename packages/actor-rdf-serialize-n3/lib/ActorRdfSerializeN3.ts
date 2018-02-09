import {ActorRdfSerializeFixedMediaTypes, IActionRdfSerialize,
  IActorRdfSerializeFixedMediaTypesArgs, IActorRdfSerializeOutput} from "@comunica/bus-rdf-serialize";
import * as RDF from "rdf-js";
import * as RdfString from "rdf-string";
import {Readable} from "stream";

/**
 * A comunica N3 RDF Serialize Actor.
 */
export class ActorRdfSerializeN3 extends ActorRdfSerializeFixedMediaTypes {

  constructor(args: IActorRdfSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfSerialize, mediaType: string): Promise<IActorRdfSerializeOutput> {
    const n3Triples = new Readable({ objectMode: true });
    n3Triples._read = () => {
      return;
    };

    action.quads.on('data', (quad: RDF.Quad) => n3Triples.push(RdfString.quadToStringQuad(quad)));
    action.quads.on('end', () => n3Triples.emit('end'));

    return { data: n3Triples.pipe((require('n3').StreamWriter)({ format: mediaType })),
      triples: mediaType === 'text/turtle'
      || mediaType === 'application/n-triples'
      || mediaType === 'text/n3' };
  }

}
