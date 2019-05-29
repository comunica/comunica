import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {
  ActorRdfSourceIdentifier, IActionRdfSourceIdentifier, IActorRdfSourceIdentifierArgs,
  IActorRdfSourceIdentifierOutput,
} from "@comunica/bus-rdf-source-identifier";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {IMediatorTypePriority} from "@comunica/mediatortype-priority";

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

  public async test(action: IActionRdfSourceIdentifier): Promise<IMediatorTypePriority> {
    const sourceUrl = this.getSourceUrl(action);
    const headers: Headers = new Headers();
    headers.append('Accept', this.allowedMediaTypes.join(','));
    const httpAction: IActionHttp = { context: action.context,
      init: { headers, method: 'HEAD' }, input: sourceUrl};
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);
    if (!httpResponse.ok || (httpResponse.headers.has('Content-Type')
      && !this.allowedMediaTypes.find((mediaType: string) => httpResponse.headers
        .get('Content-Type').indexOf(mediaType) >= 0))) {
      throw new Error(`${sourceUrl} (${httpResponse.headers.get('Content-Type')}) \
is not an RDF file of valid content type: ${this.allowedMediaTypes}`);
    }
    return { priority: this.priority };
  }

  public async run(action: IActionRdfSourceIdentifier): Promise<IActorRdfSourceIdentifierOutput> {
    return { sourceType: 'file' };
  }

}

export interface IActorRdfSourceIdentifierFileContentTypeArgs
  extends IActorRdfSourceIdentifierArgs {
  allowedMediaTypes: string[];
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
}
