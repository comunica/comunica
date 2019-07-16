import {ActorRdfParseHtml, IActionRdfParseHtml, IActorRdfParseHtmlOutput} from "@comunica/bus-rdf-parse-html";
import {IActorArgs, IActorTest} from "@comunica/core";
import {RdfaParser} from "rdfa-streaming-parser";

/**
 * A comunica RDFa RDF Parse Html Actor.
 */
export class ActorRdfParseHtmlRdfa extends ActorRdfParseHtml {

  constructor(args: IActorArgs<IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>) {
    super(args);
  }

  public async test(action: IActionRdfParseHtml): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfParseHtml): Promise<IActorRdfParseHtmlOutput> {
    const mediaType = action.headers ? action.headers.get('content-type') : null;
    const language = action.headers ? action.headers.get('content-language') : null;
    const profile = mediaType && mediaType.indexOf('xml') >= 0 ? 'xhtml' : 'html';

    const htmlParseListener = new RdfaParser({ baseIRI: action.baseIRI, profile, language });
    htmlParseListener.on('error', action.error);
    htmlParseListener.on('data', action.emit);
    const onTagEndOld = htmlParseListener.onEnd;
    htmlParseListener.onEnd = () => {
      onTagEndOld.call(htmlParseListener);
      action.end();
    };
    return { htmlParseListener };
  }

}
