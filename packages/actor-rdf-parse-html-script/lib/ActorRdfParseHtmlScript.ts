/* eslint-disable @typescript-eslint/unbound-method */
import type {
  IActionHandleRdfParse,
  IActionMediaTypesRdfParse,
  IActorOutputHandleRdfParse,
  IActorOutputMediaTypesRdfParse,
  IActorTestHandleRdfParse,
  IActorTestMediaTypesRdfParse,
} from '@comunica/bus-rdf-parse';
import type { IActionRdfParseHtml, IActorRdfParseHtmlOutput } from '@comunica/bus-rdf-parse-html';
import { ActorRdfParseHtml } from '@comunica/bus-rdf-parse-html';
import type { Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import { HtmlScriptListener } from './HtmlScriptListener';

/**
 * A HTML script RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to extract and parse any RDF serialization from script tags in HTML files
 * and announce the presence of them by media type.
 */
export class ActorRdfParseHtmlScript extends ActorRdfParseHtml {
  private readonly mediatorRdfParseMediatypes: Mediator<
  Actor<IActionMediaTypesRdfParse, IActorTestMediaTypesRdfParse, IActorOutputMediaTypesRdfParse>,
  IActionMediaTypesRdfParse, IActorTestMediaTypesRdfParse, IActorOutputMediaTypesRdfParse>;

  private readonly mediatorRdfParseHandle: Mediator<
  Actor<IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>,
  IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>;

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

export interface IActorRdfParseHtmlScriptArgs
  extends IActorArgs<IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput> {
  mediatorRdfParseMediatypes: Mediator<
  Actor<IActionMediaTypesRdfParse, IActorTestMediaTypesRdfParse, IActorOutputMediaTypesRdfParse>,
  IActionMediaTypesRdfParse, IActorTestMediaTypesRdfParse, IActorOutputMediaTypesRdfParse>;
  mediatorRdfParseHandle: Mediator<
  Actor<IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>,
  IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>;
}
