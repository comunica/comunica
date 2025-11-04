import type {
  IActionRdfSerialize,
  IActorRdfSerializeFixedMediaTypesArgs,
  IActorRdfSerializeOutput,
} from '@comunica/bus-rdf-serialize';
import {
  ActorRdfSerializeFixedMediaTypes,
} from '@comunica/bus-rdf-serialize';
import type { IActionContext } from '@comunica/types';
import { JsonLdSerializer } from 'jsonld-streaming-serializer';

/**
 * A comunica Jsonld RDF Serialize Actor.
 */
export class ActorRdfSerializeJsonLd extends ActorRdfSerializeFixedMediaTypes {
  /**
   * The number of spaces that should be used to indent stringified JSON.
   */
  public readonly jsonStringifyIndentSpaces: number;

  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/ld+json": 1.0
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/ld+json": "http://www.w3.org/ns/formats/JSON-LD"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorRdfSerializeJsonLdArgs) {
    super(args);
    this.jsonStringifyIndentSpaces = args.jsonStringifyIndentSpaces;
  }

  public async runHandle(action: IActionRdfSerialize, _mediaType: string, _context: IActionContext):
  Promise<IActorRdfSerializeOutput> {
    const writer = new JsonLdSerializer(
      { space: ' '.repeat(this.jsonStringifyIndentSpaces) },
    );
    let data: NodeJS.ReadableStream;
    if ('pipe' in action.quadStream) {
      // Prefer piping if possible, to maintain backpressure
      action.quadStream.on('error', error => writer.emit('error', error));
      data = (<any> action.quadStream).pipe(writer);
    } else {
      data = <any> writer.import(action.quadStream);
    }
    return { data };
  }
}

export interface IActorRdfSerializeJsonLdArgs extends IActorRdfSerializeFixedMediaTypesArgs {
  /**
   * The number of spaces that should be used to indent stringified JSON.
   * @range {integer}
   * @default {2}
   */
  jsonStringifyIndentSpaces: number;
}
