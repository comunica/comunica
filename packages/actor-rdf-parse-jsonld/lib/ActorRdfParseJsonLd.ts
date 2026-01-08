import type { MediatorHttp } from '@comunica/bus-http';
import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { IActionRdfParse, IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import { KeysInitQuery, KeysRdfParseHtmlScript, KeysRdfParseJsonLd } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import type { IJsonLdContext } from 'jsonld-context-parser';
import { JsonLdParser } from 'jsonld-streaming-parser';
import { LRUCache } from 'lru-cache';
import type { Readable } from 'readable-stream';
import type { DocumentLoaderMediatedCache } from './DocumentLoaderMediated';
import { DocumentLoaderMediated } from './DocumentLoaderMediated';

/**
 * A JSON-LD RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to parse JSON-LD-based RDF serializations and announce the presence of them by media type.
 */
export class ActorRdfParseJsonLd extends ActorRdfParseFixedMediaTypes {
  public readonly mediatorHttp: MediatorHttp;

  public readonly httpInvalidator: ActorHttpInvalidateListenable;
  private readonly cache: DocumentLoaderMediatedCache | undefined;

  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/ld+json": 1.0,
   *       "application/json": 0.15
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/ld+json": "http://www.w3.org/ns/formats/JSON-LD",
   *       "application/json": "http://www.w3.org/ns/formats/JSON-LD"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorRdfParseJsonLdArgs) {
    super(args);
    this.mediatorHttp = args.mediatorHttp;
    this.httpInvalidator = args.httpInvalidator;
    this.cache = args.cacheSize ?
      new LRUCache<string, {
        context: IJsonLdContext;
        isStillValid: ((context: IActionContext) => Promise<boolean>) | undefined;
      }>({ max: args.cacheSize }) :
      undefined;
    const cache = this.cache;
    if (cache) {
      this.httpInvalidator.addInvalidateListener(
        ({ url }: IActionHttpInvalidate) => url ? cache.delete(url) : cache.clear(),
      );
    }
  }

  public override async testHandle(action: IActionRdfParse, mediaType: string | undefined, context: IActionContext):
  Promise<TestResult<IActorTest>> {
    if (context.has(KeysRdfParseHtmlScript.processingHtmlScript) && mediaType !== 'application/ld+json') {
      return failTest(`JSON-LD in script tags can only have media type 'application/ld+json'`);
    }
    if (!mediaType || !(mediaType in this.mediaTypePriorities || mediaType.endsWith('+json'))) {
      return failTest(`Unrecognized media type: ${mediaType}`);
    }
    return await this.testHandleChecked(action);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, actionContext: IActionContext):
  Promise<IActorRdfParseOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const parser = JsonLdParser.fromHttpResponse(action.metadata?.baseIRI ?? '', mediaType, action.headers, {
      dataFactory,
      documentLoader: actionContext.get(KeysRdfParseJsonLd.documentLoader) ??
        new DocumentLoaderMediated(this.mediatorHttp, actionContext, this.cache),
      strictValues: actionContext.get(KeysRdfParseJsonLd.strictValues),
      ...actionContext.get(KeysRdfParseJsonLd.parserOptions),
    });
    const data = <Readable> parser.import(action.data);
    return { data };
  }
}

export interface IActorRdfParseJsonLdArgs extends IActorRdfParseFixedMediaTypesArgs {
  /**
   * The maximum number of entries in the LRU cache, set to 0 to disable.
   * @range {integer}
   * @default {128}
   */
  cacheSize: number;
  /* eslint-disable max-len */
  /**
   * An actor that listens to HTTP invalidation events
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^5.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /* eslint-enable max-len */
  /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
}
