import type { MediatorRdfParseHandle, MediatorRdfParseMediaTypes } from '@comunica/bus-rdf-parse';
import type { IActionRdfParseHtml, IActorRdfParseHtmlOutput,
  IActorRdfParseHtmlArgs } from '@comunica/bus-rdf-parse-html';
import { ActorRdfParseHtml } from '@comunica/bus-rdf-parse-html';
import type { IActorTest } from '@comunica/core';
import { HtmlScriptListener } from './HtmlScriptListener';

/**
 * A HTML script RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to extract and parse any RDF serialization from script tags in HTML files
 * and announce the presence of them by media type.
 */
export class ActorRdfParseHtmlScript extends ActorRdfParseHtml {
  private readonly mediatorRdfParseMediatypes: MediatorRdfParseMediaTypes;
  private readonly mediatorRdfParseHandle: MediatorRdfParseHandle;

  public constructor(args: IActorRdfParseHtmlScriptArgs) {
    super(args);
  }

  public async test(action: IActionRdfParseHtml): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfParseHtml): Promise<IActorRdfParseHtmlOutput> {
    const supportedTypes: Record<string, number> = (await this.mediatorRdfParseMediatypes
      .mediate({ context: action.context, mediaTypes: true })).mediaTypes;
    const htmlParseListener = new HtmlScriptListener(
      this.mediatorRdfParseHandle,
      action.emit,
      action.error,
      action.end,
      supportedTypes,
      action.context,
      action.baseIRI,
      action.headers,
    );
    return { htmlParseListener };
  }
}

export interface IActorRdfParseHtmlScriptArgs extends IActorRdfParseHtmlArgs {
  /**
   * The RDF Parse mediator for collecting media types
   */
  mediatorRdfParseMediatypes: MediatorRdfParseMediaTypes;
  /**
   * The RDF Parse mediator for handling parsing
   */
  mediatorRdfParseHandle: MediatorRdfParseHandle;
}
