import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type { IActionRdfSourceIdentifier, IActorRdfSourceIdentifierArgs,
  IActorRdfSourceIdentifierOutput } from '@comunica/bus-rdf-source-identifier';
import {
  ActorRdfSourceIdentifier,
} from '@comunica/bus-rdf-source-identifier';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import type { IMediatorTypePriority } from '@comunica/mediatortype-priority';

/**
 * A comunica File Content Type RDF Source Identifier Actor.
 */
export class ActorRdfSourceIdentifierFileContentType extends ActorRdfSourceIdentifier {
  public readonly allowedMediaTypes: string[];
  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  public constructor(args: IActorRdfSourceIdentifierFileContentTypeArgs) {
    super(args);
  }

  public async test(action: IActionRdfSourceIdentifier): Promise<IMediatorTypePriority> {
    const sourceUrl = this.getSourceUrl(action);
    const headers: Headers = new Headers();
    headers.append('Accept', this.allowedMediaTypes.join(','));
    const httpAction: IActionHttp = { context: action.context,
      init: { headers, method: 'HEAD' },
      input: sourceUrl };
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);
    if (!httpResponse.ok || (httpResponse.headers.has('Content-Type') &&
      !this.allowedMediaTypes.some((mediaType: string) => {
        const contentType = httpResponse.headers.get('Content-Type');
        return contentType && contentType.includes(mediaType);
      }))) {
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
