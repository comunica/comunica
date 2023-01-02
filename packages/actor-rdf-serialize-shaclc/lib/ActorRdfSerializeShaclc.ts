import type { IActionRdfSerialize,
  IActorRdfSerializeFixedMediaTypesArgs,
  IActorRdfSerializeOutput } from '@comunica/bus-rdf-serialize';
import {
  ActorRdfSerializeFixedMediaTypes,
} from '@comunica/bus-rdf-serialize';
import type { IActionContext } from '@comunica/types';
import { wrap } from 'asynciterator';
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
    // TODO: Get prefixes (from somewhere)

    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    try {
      const { text } = await write(
        await wrap(action.quadStream).toArray(),
        { errorOnUnused: true, extendedSyntax: mediaType === 'text/shaclc-ext' },
      );
      data.push(text);
    } catch (error: unknown) {
      // Push the error into the stream
      data.push(error);
    }
    data.push(null);

    return {
      data,
      triples: true,
    };
  }
}
