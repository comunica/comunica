import type {
  IActionRdfParseHtml,
  IActorRdfParseHtmlOutput,
  IActorRdfParseHtmlArgs,
} from '@comunica/bus-rdf-parse-html';
import { ActorRdfParseHtml } from '@comunica/bus-rdf-parse-html';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { RdfaParser } from 'rdfa-streaming-parser';

/**
 * A comunica RDFa RDF Parse Html Actor.
 */
export class ActorRdfParseHtmlRdfa extends ActorRdfParseHtml {
  public constructor(args: IActorRdfParseHtmlArgs) {
    super(args);
  }

  public async test(_action: IActionRdfParseHtml): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionRdfParseHtml): Promise<IActorRdfParseHtmlOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const mediaType = action.headers ? action.headers.get('content-type') : null;
    const language = (action.headers && action.headers.get('content-language')) ?? undefined;
    const profile = mediaType && mediaType.includes('xml') ? 'xhtml' : 'html';

    const htmlParseListener = new RdfaParser({ dataFactory, baseIRI: action.baseIRI, profile, language });
    htmlParseListener.on('error', action.error);
    htmlParseListener.on('data', action.emit);
    // eslint-disable-next-line ts/unbound-method
    const onTagEndOld = htmlParseListener.onEnd;
    htmlParseListener.onEnd = () => {
      onTagEndOld.call(htmlParseListener);
      action.end();
    };
    return { htmlParseListener };
  }
}
