import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
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
    if (!action.sourceValue.startsWith('http')) {
      throw new Error(`Actor ${this.name} can only detect hypermedia interfaces hosted via HTTP(S).`);
    }
    const headers: Headers = new Headers();
    headers.append('Accept', this.acceptHeader);

    const httpAction: IActionHttp = { context: action.context, input: action.sourceValue, init: { headers } };
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);
    if (httpResponse.ok) {
      const body = (await require('stream-to-string')(httpResponse.body));

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

    throw new Error(`${action.sourceValue} is not a (QPF) hypermedia interface`);
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
