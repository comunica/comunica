import type {
  IActionRdfParse,
  IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput,
} from '@comunica/bus-rdf-parse';
import {
  ActorRdfParseFixedMediaTypes,
} from '@comunica/bus-rdf-parse';
import type { IActionContext } from '@comunica/types';
import type { Quad } from '@rdfjs/types';
import { WrappingIterator } from 'asynciterator';
import { parse } from 'shaclc-parse';

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

  public async runHandle(action: IActionRdfParse, mediaType: string, context: IActionContext):
  Promise<IActorRdfParseOutput> {
    return {
      data: <any> new PrefixWrappingIterator(
        toString(action.data).then(str => parse(str, { extendedSyntax: mediaType === 'text/shaclc-ext' })),
      ),
      metadata: { triples: true },
    };
  }
}

class PrefixWrappingIterator extends WrappingIterator<Quad> {
  private prefixes?: Record<string, string>;
  public constructor(source: Promise<Quad[] & { prefixes: Record<string, string> }> | undefined) {
    super(source?.then(src => {
      this.prefixes = src.prefixes;
      return src;
    }));
  }

  public read(): Quad | null {
    // On the first read where the prefixes are available, emit them
    if (this.prefixes) {
      for (const args of Object.entries(this.prefixes)) {
        this.emit('prefix', ...args);
      }
      delete this.prefixes;
    }

    return super.read();
  }
}

function toString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((res, rej) => {
    let str = '';
    stream.on('data', chunk => {
      str += chunk;
    });
    stream.on('end', () => res(str));
    stream.on('error', rej);
  });
}
