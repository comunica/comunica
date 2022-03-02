import type { MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IActionContext } from '@comunica/types';
import { FetchDocumentLoader } from 'jsonld-context-parser';
import * as stringifyStream from 'stream-to-string';

/**
 * A JSON-LD document loader that fetches over an HTTP bus using a given mediator.
 */
export class DocumentLoaderMediated extends FetchDocumentLoader {
  private readonly mediatorHttp: MediatorHttp;

  private readonly context: IActionContext;

  public constructor(mediatorHttp: MediatorHttp,
    context: IActionContext) {
    super(DocumentLoaderMediated.createFetcher(mediatorHttp, context));
    this.mediatorHttp = mediatorHttp;
    this.context = context;
  }

  protected static createFetcher(mediatorHttp: MediatorHttp, context: IActionContext):
  (input: RequestInfo, init: RequestInit) => Promise<Response> {
    return async(url: string, init: RequestInit) => {
      const response = await mediatorHttp.mediate({ input: url, init, context });
      response.json = async() => JSON.parse(await stringifyStream(ActorHttp.toNodeReadable(response.body)));
      return response;
    };
  }
}
