import type { IActionRdfSerialize,
  IActorRdfSerializeFixedMediaTypesArgs,
  IActorRdfSerializeOutput } from '@comunica/bus-rdf-serialize';
import {
  ActorRdfSerializeFixedMediaTypes,
} from '@comunica/bus-rdf-serialize';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { Readable } from 'readable-stream';
import { write } from 'shaclc-write';

/**
 * A comunica SHACL Compact Syntax RDF Serialize Actor.
 */
export class ActorRdfSerializeShaclc extends ActorRdfSerializeFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "text/shaclc": 1.0,
   *       "text/shaclc-ext": 0.5
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "text/shaclc": "http://www.w3.org/ns/formats/Shaclc",
   *       "text/shaclc-ext": "http://www.w3.org/ns/formats/ShaclcExtended"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorRdfSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfSerialize, mediaType: string, context: IActionContext):
  Promise<IActorRdfSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    try {
      const prefixes: Record<string, string> = {};
      action.quadStream.on('prefix', (prefix, iri) => {
        prefixes[prefix] = iri;
      });

      const { text } = await write(
        await arrayifyStream(action.quadStream),
        { errorOnUnused: true, extendedSyntax: mediaType === 'text/shaclc-ext', prefixes },
      );
      data.push(text);
      data.push(null);
    } catch (error: unknown) {
      // Push the error into the stream
      data._read = () => {
        data.emit('error', error);
      };
    }

    return {
      data,
      triples: true,
    };
  }
}
