import type { IActionRdfParse, IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import type { IActionContext } from '@comunica/types';
import { RdfXmlParser } from 'rdfxml-streaming-parser';
import type { Readable } from 'readable-stream';

/**
 * A comunica RDF/XML RDF Parse Actor.
 */
export class ActorRdfParseRdfXml extends ActorRdfParseFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/rdf+xml": 1.0
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/rdf+xml": "http://www.w3.org/ns/formats/RDF_XML"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: IActionContext):
  Promise<IActorRdfParseOutput> {
    action.data.on('error', error => data.emit('error', error));
    const data = <Readable> <any> action.data.pipe(new RdfXmlParser({ baseIRI: action.metadata?.baseIRI }));
    return {
      data,
      metadata: { triples: true },
    };
  }
}
