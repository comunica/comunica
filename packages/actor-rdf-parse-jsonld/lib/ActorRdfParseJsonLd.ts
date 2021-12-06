import type { Readable } from 'stream';
import type { MediatorHttp } from '@comunica/bus-http';
import type { IActionRdfParse,
  IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import { KeysRdfParseHtmlScript, KeysRdfParseJsonLd } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { JsonLdParser } from 'jsonld-streaming-parser';
import { DocumentLoaderMediated } from './DocumentLoaderMediated';

/**
 * A JSON-LD RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to parse JSON-LD-based RDF serializations and announce the presence of them by media type.
 */
export class ActorRdfParseJsonLd extends ActorRdfParseFixedMediaTypes {
  public readonly mediatorHttp: MediatorHttp;

  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/ld+json": 1.0,
   *       "application/json": 0.5
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/ld+json": "http://www.w3.org/ns/formats/JSON-LD",
   *       "application/json": "http://www.w3.org/ns/formats/JSON-LD"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorRdfParseJsonLdArgs) {
    super(args);
  }

  public async testHandle(action: IActionRdfParse, mediaType: string, context: IActionContext): Promise<IActorTest> {
    if (context &&
      context.has(KeysRdfParseHtmlScript.processingHtmlScript) &&
      mediaType !== 'application/ld+json') {
      throw new Error(`JSON-LD in script tags can only have media type 'application/ld+json'`);
    }
    if (!(mediaType in this.mediaTypePriorities) && !mediaType.endsWith('+json')) {
      throw new Error(`Unrecognized media type: ${mediaType}`);
    }
    return await this.testHandleChecked(action);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, actionContext: IActionContext):
  Promise<IActorRdfParseOutput> {
    const parser = JsonLdParser.fromHttpResponse(action.baseIRI, mediaType, action.headers, {
      documentLoader: actionContext && actionContext.get(KeysRdfParseJsonLd.documentLoader) ||
        new DocumentLoaderMediated(this.mediatorHttp, actionContext),
      strictValues: actionContext && actionContext.get(KeysRdfParseJsonLd.strictValues),
      ...actionContext && actionContext.get(KeysRdfParseJsonLd.parserOptions),
    });
    const quads = <Readable> parser.import(action.input);
    return { quads };
  }
}

export interface IActorRdfParseJsonLdArgs extends IActorRdfParseFixedMediaTypesArgs {
  /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
}
