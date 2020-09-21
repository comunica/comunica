import type { IActionRdfParse, IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import type { ActionContext } from '@comunica/core';
import { RdfXmlParser } from 'rdfxml-streaming-parser';

/**
 * A comunica RDF/XML RDF Parse Actor.
 */
export class ActorRdfParseRdfXml extends ActorRdfParseFixedMediaTypes {
  public constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
  Promise<IActorRdfParseOutput> {
    action.input.on('error', error => quads.emit('error', error));
    const quads = action.input.pipe(new RdfXmlParser({ baseIRI: action.baseIRI }));
    return {
      quads,
      triples: true,
    };
  }
}
