import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IActionRdfSourceIdentifier, IActorRdfSourceIdentifierArgs,
  IActorRdfSourceIdentifierOutput } from '@comunica/bus-rdf-source-identifier';
import {
  ActorRdfSourceIdentifier,
} from '@comunica/bus-rdf-source-identifier';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import type { IMediatorTypePriority } from '@comunica/mediatortype-priority';
import 'cross-fetch/polyfill';

/**
 * A comunica Hypermedia Qpf RDF Source Identifier Actor.
 */
export class ActorRdfSourceIdentifierHypermediaQpf extends ActorRdfSourceIdentifier {
  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  public readonly acceptHeader: string;
  public readonly toContain: string[];

  public constructor(args: IActorRdfSourceIdentifierHypermediaQpfArgs) {
    super(args);
  }

  public async test(action: IActionRdfSourceIdentifier): Promise<IMediatorTypePriority> {
    const sourceUrl = this.getSourceUrl(action);
    const headers: Headers = new Headers();
    headers.append('Accept', this.acceptHeader);

    const httpAction: IActionHttp = { context: action.context, input: sourceUrl, init: { headers }};
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);
    if (httpResponse.ok && httpResponse.body) {
      const stream = ActorHttp.toNodeReadable(httpResponse.body);
      const body = await require('stream-to-string')(stream);

      // Check if body contains all required things
      let valid = true;
      for (const line of this.toContain) {
        if (!body.includes(line)) {
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
      await httpResponse.body.cancel();
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
