import type { IActionRdfParse, IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import { KeysInitQuery } from '@comunica/context-entries';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import { StreamParser } from 'rdf-parser-ts';
import type { Readable } from 'readable-stream';

/**
 * An rdf-parser.ts RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to parse Turtle, TriG, N-Quads, and N-Triples.
 */
export class ActorRdfParseRdfParserTs extends ActorRdfParseFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/n-quads": 1.0,
   *       "application/trig": 0.95,
   *       "application/n-triples": 0.8,
   *       "text/turtle": 0.6
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/n-quads": "http://www.w3.org/ns/formats/N-Quads",
   *       "application/trig": "http://www.w3.org/ns/formats/TriG",
   *       "application/n-triples": "http://www.w3.org/ns/formats/N-Triples",
   *       "text/turtle": "http://www.w3.org/ns/formats/Turtle"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, _context: IActionContext):
  Promise<IActorRdfParseOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    action.data.on('error', error => data.emit('error', error));
    const data = <Readable><any>action.data.pipe(new StreamParser({
      factory: dataFactory,
      baseIRI: action.metadata?.baseIRI,
      format: `${mediaType}*`,
    }));
    return {
      data,
      metadata: {
        triples: mediaType === 'text/turtle' ||
        mediaType === 'application/n-triples',
      },
    };
  }
}
