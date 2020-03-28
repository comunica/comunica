import {IActionRootRdfParse, IActorOutputRootRdfParse, IActorTestRootRdfParse} from "@comunica/bus-rdf-parse";
import {ActorRdfParseHtml, IActionRdfParseHtml, IActorRdfParseHtmlOutput} from "@comunica/bus-rdf-parse-html";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {HtmlScriptListener} from "./HtmlScriptListener";

/**
 * A HTML script RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to extract and parse any RDF serialization from script tags in HTML files
 * and announce the presence of them by media type.
 */
export class ActorRdfParseHtmlScript extends ActorRdfParseHtml {

  private readonly mediatorRdfParseMediatypes: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
  private readonly mediatorRdfParseHandle: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;

  constructor(args: IActorRdfParseHtmlScriptArgs) {
    super(args);
  }

  public async test(action: IActionRdfParseHtml): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfParseHtml): Promise<IActorRdfParseHtmlOutput> {
    const supportedTypes: {[id: string]: number} = (await this.mediatorRdfParseMediatypes
      .mediate({ context: action.context, mediaTypes: true })).mediaTypes;
    const htmlParseListener = new HtmlScriptListener(this.mediatorRdfParseHandle, action.emit, action.error, action.end,
      supportedTypes, action.context, action.baseIRI, action.headers);
    return { htmlParseListener };
  }
}

export interface IActorRdfParseHtmlScriptArgs
  extends IActorArgs<IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput> {
  mediatorRdfParseMediatypes: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
  mediatorRdfParseHandle: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
}
