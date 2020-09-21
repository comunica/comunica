/* eslint-disable @typescript-eslint/unbound-method */
import type { IActionRdfParseHtml, IActorRdfParseHtmlOutput } from '@comunica/bus-rdf-parse-html';
import { ActorRdfParseHtml } from '@comunica/bus-rdf-parse-html';
import type { IActorArgs, IActorTest } from '@comunica/core';
import { RdfaParser } from 'rdfa-streaming-parser';

/**
 * A comunica RDFa RDF Parse Html Actor.
 */
export class ActorRdfParseHtmlRdfa extends ActorRdfParseHtml {
  public constructor(args: IActorArgs<IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>) {
    super(args);
  }

  public async test(action: IActionRdfParseHtml): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfParseHtml): Promise<IActorRdfParseHtmlOutput> {
    const mediaType = action.headers ? action.headers.get('content-type') : null;
    const language = (action.headers && action.headers.get('content-language')) ?? undefined;
    const profile = mediaType && mediaType.includes('xml') ? 'xhtml' : 'html';

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
