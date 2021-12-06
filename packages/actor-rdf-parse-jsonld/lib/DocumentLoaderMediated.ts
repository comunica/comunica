import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { FetchDocumentLoader } from 'jsonld-context-parser';
import * as stringifyStream from 'stream-to-string';

/**
 * A JSON-LD document loader that fetches over an HTTP bus using a given mediator.
 */
export class DocumentLoaderMediated extends FetchDocumentLoader {
  private readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  private readonly context: IActionContext;

  public constructor(mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>,
  context: IActionContext) {
    super(DocumentLoaderMediated.createFetcher(mediatorHttp, context));
    this.mediatorHttp = mediatorHttp;
    this.context = context;
  }

  protected static createFetcher(mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>,
  context: IActionContext):
    (input: RequestInfo, init: RequestInit) => Promise<Response> {
    return async(url: string, init: RequestInit) => {
      const response = await mediatorHttp.mediate({ input: url, init, context });
      response.json = async() => JSON.parse(await stringifyStream(ActorHttp.toNodeReadable(response.body)));
      return response;
    };
  }
}
