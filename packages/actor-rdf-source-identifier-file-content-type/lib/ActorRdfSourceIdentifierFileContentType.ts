import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {ActorRdfSourceIdentifier, IActionRdfSourceIdentifier,
  IActorRdfSourceIdentifierOutput} from "@comunica/bus-rdf-source-identifier";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";

/**
 * A comunica File Content Type RDF Source Identifier Actor.
 */
export class ActorRdfSourceIdentifierFileContentType extends ActorRdfSourceIdentifier {

  public readonly allowedMediaTypes: string[];
  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;

  constructor(args: IActorRdfSourceIdentifierFileContentTypeArgs) {
    super(args);
  }

  public async test(action: IActionRdfSourceIdentifier): Promise<IActorTest> {
    if (!action.sourceValue.startsWith('http')) {
      throw new Error(`Actor ${this.name} can only detect files hosted via HTTP(S).`);
    }
    const headers: Headers = new Headers();
    headers.append('Accept', this.allowedMediaTypes.join(';'));
    const httpAction: IActionHttp = { input: action.sourceValue, init: { headers, method: 'HEAD' } };
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);
    if (!httpResponse.ok || !this.allowedMediaTypes.find((mediaType: string) => httpResponse.headers
        .get('Content-Type').indexOf(mediaType) >= 0)) {
      throw new Error(`${action.sourceValue} is not an RDF file of valid content type: ${this.allowedMediaTypes}`);
    }
    return { order: 2 };
  }

  public async run(action: IActionRdfSourceIdentifier): Promise<IActorRdfSourceIdentifierOutput> {
    return { sourceType: 'file' };
  }

}

export interface IActorRdfSourceIdentifierFileContentTypeArgs
  extends IActorArgs<IActionRdfSourceIdentifier, IActorTest, IActorRdfSourceIdentifierOutput> {
  allowedMediaTypes: string[];
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
}
