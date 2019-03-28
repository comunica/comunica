import {ActorHttp, IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {
  ActorRdfSourceIdentifier, IActionRdfSourceIdentifier, IActorRdfSourceIdentifierArgs,
  IActorRdfSourceIdentifierOutput,
} from "@comunica/bus-rdf-source-identifier";
import {Actor, IActorTest, Mediator} from "@comunica/core";
import {IMediatorTypePriority} from "@comunica/mediatortype-priority";
import "isomorphic-fetch";

/**
 * A comunica Hypermedia Qpf RDF Source Identifier Actor.
 */
export class ActorRdfSourceIdentifierHypermediaQpf extends ActorRdfSourceIdentifier {

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  public readonly acceptHeader: string;
  public readonly toContain: string[];

  constructor(args: IActorRdfSourceIdentifierHypermediaQpfArgs) {
    super(args);
  }

  public async test(action: IActionRdfSourceIdentifier): Promise<IMediatorTypePriority> {
    const sourceUrl = this.getSourceUrl(action);
    const headers: Headers = new Headers();
    headers.append('Accept', this.acceptHeader);

    const httpAction: IActionHttp = { context: action.context, input: sourceUrl, init: { headers } };
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);
    if (httpResponse.ok) {
      const stream = ActorHttp.toNodeReadable(httpResponse.body);
      const body = (await require('stream-to-string')(stream));

      // Check if body contains all required things
      let valid = true;
      for (const line of this.toContain) {
        if (body.indexOf(line) < 0) {
          valid = false;
          break;
        }
      }
      if (valid) {
        return { priority: this.priority };
      }
    }

    // Avoid memory leaks
    if (httpResponse.body) {
      httpResponse.body.cancel();
    }

    throw new Error(`${sourceUrl} is not a (QPF) hypermedia interface`);
  }

  public async run(action: IActionRdfSourceIdentifier): Promise<IActorRdfSourceIdentifierOutput> {
    return { sourceType: 'hypermedia' };
  }

}

export interface IActorRdfSourceIdentifierHypermediaQpfArgs
  extends IActorRdfSourceIdentifierArgs {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  acceptHeader: string;
  toContain: string[];
}
