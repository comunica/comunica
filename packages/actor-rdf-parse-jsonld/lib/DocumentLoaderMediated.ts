import {ActorHttp, IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import {IDocumentLoader, IJsonLdContext} from "jsonld-context-parser";
import * as stringifyStream from "stream-to-string";

/**
 * A JSON-LD document loader that fetches over an HTTP bus using a given mediator.
 */
export class DocumentLoaderMediated implements IDocumentLoader {

  private readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  private readonly context: ActionContext;

  constructor(mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
                IActionHttp, IActorTest, IActorHttpOutput>,
              context: ActionContext) {
    this.mediatorHttp = mediatorHttp;
    this.context = context;
  }

  public async load(url: string): Promise<IJsonLdContext> {
    const response = await this.mediatorHttp.mediate(
      { input: url, init: { headers: new Headers({ accept: 'application/ld+json' }) }, context: this.context });
    if (response.ok) {
      return JSON.parse(await stringifyStream(ActorHttp.toNodeReadable(response.body)));
    } else {
      throw new Error(`No valid context was found at ${url}: ${response.statusText}`);
    }
  }

}
