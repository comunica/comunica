import type {
  IActionRdfParseHtml,
  IActorRdfParseHtmlArgs,
  IActorRdfParseHtmlOutput,
} from '@comunica/bus-rdf-parse-html';
import { ActorRdfParseHtml } from '@comunica/bus-rdf-parse-html';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { MicrodataRdfParser } from 'microdata-rdf-streaming-parser';

/**
 * A comunica Microdata RDF Parse Html Actor.
 */
export class ActorRdfParseHtmlMicrodata extends ActorRdfParseHtml {
  public constructor(args: IActorRdfParseHtmlArgs) {
    super(args);
  }

  public async test(_action: IActionRdfParseHtml): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionRdfParseHtml): Promise<IActorRdfParseHtmlOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const mediaType = action.headers ? action.headers.get('content-type') : null;
    const xmlMode = mediaType?.includes('xml');

    const htmlParseListener = new MicrodataRdfParser({ dataFactory, baseIRI: action.baseIRI, xmlMode });
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
