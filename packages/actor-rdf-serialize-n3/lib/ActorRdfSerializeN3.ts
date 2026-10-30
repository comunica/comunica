import type {
  IActionRdfSerialize,
  IActorRdfSerializeFixedMediaTypesArgs,
  IActorRdfSerializeOutput,
} from '@comunica/bus-rdf-serialize';
import {
  ActorRdfSerializeFixedMediaTypes,
} from '@comunica/bus-rdf-serialize';
import { KeysRdfSerialize } from '@comunica/context-entries';
import type { Writer } from 'n3';
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

  public async runHandle(action: IActionRdfSerialize, mediaType: string):
  Promise<IActorRdfSerializeOutput> {
    const prefixes = action.context.get(KeysRdfSerialize.rdfSerializationPrefixes);
    const writer = new StreamWriter({
      format: mediaType,
      prefixes,
    });
    const prefixNames = new Set(Object.keys(prefixes ?? {}));
    action.quadStream.on('prefix', (prefix, iri) => {
      // Keep context prefixes and the first definition of each stream prefix.
      // N3 retains old namespace mappings on rebinding, which can change the meaning of later quads.
      if (!prefixNames.has(prefix)) {
        prefixNames.add(prefix);
        // Match N3 StreamWriter.import(): _writer is an internal API omitted from its typings.
        (<StreamWriter & { _writer: Writer }> writer)._writer.addPrefix(prefix, iri);
      }
    });
    action.quadStream.on('error', error => writer.emit('error', error));
    let data: NodeJS.ReadableStream;
    if ('pipe' in action.quadStream) {
      // Prefer piping if possible, to maintain backpressure
      data = (<any> action.quadStream).pipe(writer);
    } else {
      // Match import() without its unconditional prefix forwarding.
      action.quadStream.on('data', quad => writer.write(quad));
      action.quadStream.on('end', () => writer.end());
      data = writer;
    }
    return { data, triples: mediaType === 'text/turtle' ||
      mediaType === 'application/n-triples' ||
      mediaType === 'text/n3' };
  }
}
