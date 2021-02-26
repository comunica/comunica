import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type { IActionRdfParse,
  IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import { KeysRdfParseJsonLd } from '@comunica/context-entries';
import type { ActionContext, Actor, IActorTest, Mediator } from '@comunica/core';
import { JsonLdParser } from 'jsonld-streaming-parser';
import type * as RDF from 'rdf-js';
import { DocumentLoaderMediated } from './DocumentLoaderMediated';

/**
 * A JSON-LD RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to parse JSON-LD-based RDF serializations and announce the presence of them by media type.
 */
export class ActorRdfParseJsonLd extends ActorRdfParseFixedMediaTypes {
  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  public constructor(args: IActorRdfParseJsonLdArgs) {
    super(args);
  }

  public async testHandle(action: IActionRdfParse, mediaType: string, context: ActionContext): Promise<IActorTest> {
    if (context &&
      context.has('@comunica/actor-rdf-parse-html-script:processing-html-script') &&
      mediaType !== 'application/ld+json') {
      throw new Error(`JSON-LD in script tags can only have media type 'application/ld+json'`);
    }
    if (!(mediaType in this.mediaTypes) && !mediaType.endsWith('+json')) {
      throw new Error(`Unrecognized media type: ${mediaType}`);
    }
    return await this.testHandleChecked(action);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, actionContext: ActionContext):
  Promise<IActorRdfParseOutput> {
    const parser = JsonLdParser.fromHttpResponse(action.baseIRI, mediaType, action.headers, {
      documentLoader: actionContext && actionContext.get(KeysRdfParseJsonLd.documentLoader) ||
        new DocumentLoaderMediated(this.mediatorHttp, actionContext),
      strictValues: actionContext && actionContext.get(KeysRdfParseJsonLd.strictValues),
    });
    const quads: RDF.Stream = parser.import(action.input);
    return { quads };
  }
}

export interface IActorRdfParseJsonLdArgs extends IActorRdfParseFixedMediaTypesArgs {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;
}

/**
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_DOCUMENTLOADER = KeysRdfParseJsonLd.documentLoader;
/**
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_STRICTVALUES = KeysRdfParseJsonLd.strictValues;
