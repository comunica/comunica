import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {
  ActorRdfSourceIdentifier, IActionRdfSourceIdentifier, IActorRdfSourceIdentifierArgs,
  IActorRdfSourceIdentifierOutput,
} from "@comunica/bus-rdf-source-identifier";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {IMediatorTypePriority} from "@comunica/mediatortype-priority";

/**
 * A comunica SPARQL RDF Source Identifier Actor.
 */
export class ActorRdfSourceIdentifierSparql extends ActorRdfSourceIdentifier {

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;

  constructor(args: IActorRdfSourceIdentifierSparqlArgs) {
    super(args);
  }

  public async test(action: IActionRdfSourceIdentifier): Promise<IMediatorTypePriority> {
    const sourceUrl = this.getSourceUrl(action);
    const url: string = sourceUrl + '?query=' + encodeURIComponent('ASK { ?s a ?o }');
    const headers: Headers = new Headers();
    headers.append('Accept', 'application/sparql-results+json');
    const httpAction: IActionHttp = { context: action.context, input: url, init: { headers, method: 'GET' } };
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);

    // No need to process the body. (HEAD requests would be better, but not all endpoints implement that properly)
    httpResponse.body.cancel();

    if (!httpResponse.ok || httpResponse.headers.get('Content-Type').indexOf('application/sparql-results+json') < 0) {
      throw new Error(`${sourceUrl} is not a SPARQL endpoint`);
    }
    return { priority: this.priority};
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
