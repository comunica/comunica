import {ActorRdfSerializeFixedMediaTypes, IActionRdfSerialize,
  IActorRdfSerializeFixedMediaTypesArgs, IActorRdfSerializeOutput} from "@comunica/bus-rdf-serialize";
import {ActionContext} from "@comunica/core";
import {StreamWriter} from "n3";
import * as RDF from "rdf-js";
import {Readable} from "stream";

/**
 * A comunica N3 RDF Serialize Actor.
 */
export class ActorRdfSerializeN3 extends ActorRdfSerializeFixedMediaTypes {

  constructor(args: IActorRdfSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfSerialize, mediaType: string, context: ActionContext)
    : Promise<IActorRdfSerializeOutput> {
    const n3Triples = new Readable({ objectMode: true });
    n3Triples._read = () => {
      return;
    };

    action.quads.on('error', (e) => data.emit('error', e));
    action.quads.on('data', (quad: RDF.Quad) => n3Triples.push(quad));
    action.quads.on('end', () => n3Triples.emit('end'));
    const data = n3Triples.pipe(new StreamWriter({ format: mediaType }));

    return { data,
      triples: mediaType === 'text/turtle'
      || mediaType === 'application/n-triples'
      || mediaType === 'text/n3' };
  }

}
