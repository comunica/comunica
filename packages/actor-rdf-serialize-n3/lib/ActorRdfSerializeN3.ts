import type { IActionRdfSerialize,
  IActorRdfSerializeFixedMediaTypesArgs,
  IActorRdfSerializeOutput } from '@comunica/bus-rdf-serialize';
import {
  ActorRdfSerializeFixedMediaTypes,
} from '@comunica/bus-rdf-serialize';
import type { IActionContext } from '@comunica/types';
import { StreamWriter } from 'n3';

/**
 * A comunica N3 RDF Serialize Actor.
 */
export class ActorRdfSerializeN3 extends ActorRdfSerializeFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/n-quads": 1.0,
   *       "application/trig": 0.95,
   *       "application/n-triples": 0.8,
   *       "text/turtle": 0.6,
   *       "text/n3": 0.35
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/n-quads": "http://www.w3.org/ns/formats/N-Quads",
   *       "application/trig": "http://www.w3.org/ns/formats/TriG",
   *       "application/n-triples": "http://www.w3.org/ns/formats/N-Triples",
   *       "text/turtle": "http://www.w3.org/ns/formats/Turtle",
   *       "text/n3": "http://www.w3.org/ns/formats/N3"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorRdfSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfSerialize, mediaType: string, context: IActionContext):
  Promise<IActorRdfSerializeOutput> {
    const data: NodeJS.ReadableStream = <any> new StreamWriter({ format: mediaType }).import(action.quadStream);
    return { data,
      triples: mediaType === 'text/turtle' ||
      mediaType === 'application/n-triples' ||
      mediaType === 'text/n3' };
  }
}
