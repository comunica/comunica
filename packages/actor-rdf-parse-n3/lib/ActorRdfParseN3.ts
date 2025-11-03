import type { IActionRdfParse, IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import { KeysInitQuery } from '@comunica/context-entries';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import { StreamParser } from 'n3';
import type { Readable } from 'readable-stream';

/**
 * An N3 RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to parse N3-based RDF serializations and announce the presence of them by media type.
 */
export class ActorRdfParseN3 extends ActorRdfParseFixedMediaTypes {
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
      // Enable RDF-star-mode on all formats, except N3, where this is not supported.
      format: mediaType.endsWith('n3') ? mediaType : `${mediaType}*`,
      // TODO: remove lines below once N3's types have been updated
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-expect-error
      parseUnsupportedVersions: Boolean(action.context.get(KeysInitQuery.parseUnsupportedVersions)),
      version: action.metadata?.version,
    }));
    return {
      data,
      metadata: {
        triples: mediaType === 'text/turtle' ||
        mediaType === 'application/n-triples' ||
        mediaType === 'text/n3',
      },
    };
  }
}
