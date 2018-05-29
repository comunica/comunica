import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {ActorRdfSourceIdentifier, IActionRdfSourceIdentifier,
  IActorRdfSourceIdentifierOutput} from "@comunica/bus-rdf-source-identifier";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";

/**
 * A comunica SPARQL RDF Source Identifier Actor.
 */
export class ActorRdfSourceIdentifierSparql extends ActorRdfSourceIdentifier {

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;

  constructor(args: IActorRdfSourceIdentifierSparqlArgs) {
    super(args);
  }

  public async test(action: IActionRdfSourceIdentifier): Promise<IActorTest> {
    if (!action.sourceValue.startsWith('http')) {
      throw new Error(`Actor ${this.name} can only detect SPARQL endpoints hosted via HTTP(S).`);
    }
    const url: string = action.sourceValue + '?query=' + encodeURIComponent('ASK { ?s a ?o }');
    const headers: Headers = new Headers();
    headers.append('Accept', 'application/sparql-results+json');
    const httpAction: IActionHttp = { input: url, init: { headers, method: 'HEAD' } };
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);
    if (!httpResponse.ok || httpResponse.headers.get('Content-Type').indexOf('application/sparql-results+json') < 0) {
      throw new Error(`${action.sourceValue} is not a SPARQL endpoint`);
    }
    return true;
  }

  public async run(action: IActionRdfSourceIdentifier): Promise<IActorRdfSourceIdentifierOutput> {
    return { sourceType: 'sparql' };
  }

}

export interface IActorRdfSourceIdentifierSparqlArgs
  extends IActorArgs<IActionRdfSourceIdentifier, IActorTest, IActorRdfSourceIdentifierOutput> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
}
