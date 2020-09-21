import type { IActionRdfParse, IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import type { ActionContext } from '@comunica/core';
import { RdfaParser } from 'rdfa-streaming-parser';

/**
 * A comunica XML RDFa RDF Parse Actor.
 */
export class ActorRdfParseXmlRdfa extends ActorRdfParseFixedMediaTypes {
  public constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
  Promise<IActorRdfParseOutput> {
    const language = (action.headers && action.headers.get('content-language')) ?? undefined;
    action.input.on('error', error => quads.emit('error', error));
    const quads = action.input.pipe(new RdfaParser({ baseIRI: action.baseIRI, profile: 'xml', language }));
    return { quads, triples: true };
  }
}
