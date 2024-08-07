import type {
  IActionRdfParse,
  IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput,
} from '@comunica/bus-rdf-parse';
import {
  ActorRdfParseFixedMediaTypes,
} from '@comunica/bus-rdf-parse';
import type { IActionContext } from '@comunica/types';
import { stringify as streamToString } from '@jeswr/stream-to-string';
import { Readable } from 'readable-stream';
import { parse } from 'shaclc-parse';
import { PrefixWrappingIterator } from './PrefixWrappingIterator';

/**
 * A comunica SHACL Compact Syntax RDF Parse Actor.
 */
export class ActorRdfParseShaclc extends ActorRdfParseFixedMediaTypes {
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
  public constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, _context: IActionContext):
  Promise<IActorRdfParseOutput> {
    const prefixIterator = new PrefixWrappingIterator(
      // TODO: pass data factory
      streamToString(action.data).then(str => parse(str, {
        extendedSyntax: mediaType === 'text/shaclc-ext',
        baseIRI: action.metadata?.baseIRI,
      })),
    );

    const readable = new Readable({ objectMode: true });
    prefixIterator.on('prefix', (...args) => readable.emit('prefix', ...args));

    return {
      data: readable.wrap(<any> prefixIterator),
      metadata: { triples: true },
    };
  }
}
