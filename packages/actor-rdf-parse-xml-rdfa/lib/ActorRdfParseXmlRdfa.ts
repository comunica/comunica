import type { IActionRdfParse, IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import type { IActionContext } from '@comunica/types';
import { RdfaParser } from 'rdfa-streaming-parser';
import type { Readable } from 'readable-stream';

/**
 * A comunica XML RDFa RDF Parse Actor.
 */
export class ActorRdfParseXmlRdfa extends ActorRdfParseFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/xml": 1.0,
   *       "text/xml": 1.0,
   *       "image/svg+xml": 1.0
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/xml": "http://www.w3.org/ns/formats/RDFa",
   *       "text/xml": "http://www.w3.org/ns/formats/RDFa",
   *       "image/svg+xml": "http://www.w3.org/ns/formats/RDFa"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: IActionContext):
  Promise<IActorRdfParseOutput> {
    const language = (action.headers && action.headers.get('content-language')) ?? undefined;
    action.data.on('error', error => data.emit('error', error));
    const data = <Readable><any>action.data.pipe(new RdfaParser({
      baseIRI: action.metadata?.baseIRI,
      profile: 'xml',
      language,
    }));
    return { data, metadata: { triples: true }};
  }
}
