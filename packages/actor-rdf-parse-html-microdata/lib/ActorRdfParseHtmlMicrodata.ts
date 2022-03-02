import type {
  IActionRdfParseHtml,
  IActorRdfParseHtmlArgs,
  IActorRdfParseHtmlOutput,
} from '@comunica/bus-rdf-parse-html';
import { ActorRdfParseHtml } from '@comunica/bus-rdf-parse-html';
import type { IActorTest } from '@comunica/core';
import { MicrodataRdfParser } from 'microdata-rdf-streaming-parser';

/**
 * A comunica Microdata RDF Parse Html Actor.
 */
export class ActorRdfParseHtmlMicrodata extends ActorRdfParseHtml {
  public constructor(args: IActorRdfParseHtmlArgs) {
    super(args);
  }

  public async test(action: IActionRdfParseHtml): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfParseHtml): Promise<IActorRdfParseHtmlOutput> {
    const mediaType = action.headers ? action.headers.get('content-type') : null;
    const xmlMode = mediaType?.includes('xml');

    const htmlParseListener = new MicrodataRdfParser({ baseIRI: action.baseIRI, xmlMode });
    htmlParseListener.on('error', action.error);
    htmlParseListener.on('data', action.emit);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const onTagEndOld = htmlParseListener.onEnd;
    htmlParseListener.onEnd = () => {
      onTagEndOld.call(htmlParseListener);
      action.end();
    };
    return { htmlParseListener };
  }
}
