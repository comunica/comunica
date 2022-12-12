import {
  ActorRdfSerializeFixedMediaTypes, 
  IActionRdfSerialize, 
  IActorRdfSerializeFixedMediaTypesArgs, 
  IActorRdfSerializeOutput,
} from '@comunica/bus-rdf-serialize';
import { IActionContext } from '@comunica/types';
import { write } from 'shaclc-write';
import { wrap } from 'asynciterator';
import { Readable } from 'readable-stream';

/**
 * A comunica SHACL Compact Syntax RDF Serialize Actor.
 */
export class ActorRdfSerializeShaclc extends ActorRdfSerializeFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "text/shaclc": 1.0
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "text/shaclc": "http://www.w3.org/ns/formats/Shaclc"
   *     }} mediaTypeFormats
   *   \ @defaultNested {false} isW3CRecommended
   */
  public constructor(args: IActorRdfSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfSerialize, mediaType: string, context: IActionContext):
  Promise<IActorRdfSerializeOutput> {
    // TODO: Get prefixes (from somewhere)
    const { text } = await wrap(action.quadStream).toArray().then(quads => write(quads, { errorOnUnused: true }));


    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    data.push(text);
    data.push(null);

    return {
      data,
      triples: true
    };
  }
}
