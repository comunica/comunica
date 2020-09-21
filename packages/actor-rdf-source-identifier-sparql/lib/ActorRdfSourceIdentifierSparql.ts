import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type { IActionRdfSourceIdentifier, IActorRdfSourceIdentifierArgs,
  IActorRdfSourceIdentifierOutput } from '@comunica/bus-rdf-source-identifier';
import {
  ActorRdfSourceIdentifier,
} from '@comunica/bus-rdf-source-identifier';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import type { IMediatorTypePriority } from '@comunica/mediatortype-priority';

/**
 * A comunica SPARQL RDF Source Identifier Actor.
 */
export class ActorRdfSourceIdentifierSparql extends ActorRdfSourceIdentifier {
  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  public constructor(args: IActorRdfSourceIdentifierSparqlArgs) {
    super(args);
  }

  public async test(action: IActionRdfSourceIdentifier): Promise<IMediatorTypePriority> {
    const sourceUrl = this.getSourceUrl(action);
    const url = `${sourceUrl}?query=${encodeURIComponent('ASK { ?s a ?o }')}`;
    const headers: Headers = new Headers();
    headers.append('Accept', 'application/sparql-results+json');
    const httpAction: IActionHttp = { context: action.context, input: url, init: { headers, method: 'GET' }};
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);

    // No need to process the body. (HEAD requests would be better, but not all endpoints implement that properly)
    if (httpResponse.body) {
      await httpResponse.body.cancel();
    }

    const contentType = httpResponse.headers.get('Content-Type');
    if (!httpResponse.ok || !contentType || !contentType.includes('application/sparql-results+json')) {
      throw new Error(`${sourceUrl} is not a SPARQL endpoint`);
    }
    return { priority: this.priority };
  }

  public async run(action: IActionRdfSourceIdentifier): Promise<IActorRdfSourceIdentifierOutput> {
    return { sourceType: 'sparql' };
  }
}

export interface IActorRdfSourceIdentifierSparqlArgs
  extends IActorRdfSourceIdentifierArgs {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;
}
