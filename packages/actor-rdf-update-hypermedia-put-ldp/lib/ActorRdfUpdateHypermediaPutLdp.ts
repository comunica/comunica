import type {
  IActionAbstractMediaTypedMediaTypes, IActorOutputAbstractMediaTypedMediaTypes,
  IActorTestAbstractMediaTypedMediaTypes,
} from '@comunica/actor-abstract-mediatyped';
import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type {
  IActionRdfSerialize,
  IActionRootRdfSerialize,
  IActorOutputRootRdfSerialize,
  IActorTestRootRdfSerialize,
} from '@comunica/bus-rdf-serialize';
import type { IActionRdfUpdateHypermedia, IActorRdfUpdateHypermediaOutput } from '@comunica/bus-rdf-update-hypermedia';
import { ActorRdfUpdateHypermedia } from '@comunica/bus-rdf-update-hypermedia';
import type { Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import { QuadDestinationPutLdp } from './QuadDestinationPutLdp';

/**
 * A comunica Post LDP RDF Update Hypermedia Actor.
 */
export class ActorRdfUpdateHypermediaPutLdp extends ActorRdfUpdateHypermedia {
  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  public readonly mediatorRdfSerializeMediatypes: Mediator<Actor<
  IActionAbstractMediaTypedMediaTypes, IActorTestAbstractMediaTypedMediaTypes,
  IActorOutputAbstractMediaTypedMediaTypes>,
  IActionAbstractMediaTypedMediaTypes, IActorTestAbstractMediaTypedMediaTypes,
  IActorOutputAbstractMediaTypedMediaTypes>;

  public readonly mediatorRdfSerialize: Mediator<
  Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>,
  IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;

  public constructor(args: IActorRdfUpdateHypermediaPostLdpArgs) {
    super(args, 'putLdp');
  }

  public async testMetadata(action: IActionRdfUpdateHypermedia): Promise<IActorTest> {
    if (!action.forceDestinationType) {
      if (!action.metadata.allowHttpMethods || !action.metadata.allowHttpMethods.includes('PUT')) {
        throw new Error(`Actor ${this.name} could not detect a destination with 'Allow: PUT' header.`);
      }
      if (action.exists) {
        throw new Error(`Actor ${this.name} can only put on a destination that does not already exists.`);
      }
    }
    return true;
  }

  public async run(action: IActionRdfUpdateHypermedia): Promise<IActorRdfUpdateHypermediaOutput> {
    this.logInfo(action.context, `Identified as putLdp destination: ${action.url}`);
    return {
      destination: new QuadDestinationPutLdp(
        action.url,
        action.context,
        action.metadata.putAccepted || [],
        this.mediatorHttp,
        this.mediatorRdfSerializeMediatypes,
        this.mediatorRdfSerialize,
      ),
    };
  }
}

export interface IActorRdfUpdateHypermediaPostLdpArgs
  extends IActorArgs<IActionRdfUpdateHypermedia, IActorTest, IActorRdfUpdateHypermediaOutput> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;
  mediatorRdfSerializeMediatypes: Mediator<Actor<
  IActionAbstractMediaTypedMediaTypes, IActorTestAbstractMediaTypedMediaTypes,
  IActorOutputAbstractMediaTypedMediaTypes>,
  IActionAbstractMediaTypedMediaTypes, IActorTestAbstractMediaTypedMediaTypes,
  IActorOutputAbstractMediaTypedMediaTypes>;
  mediatorRdfSerialize: Mediator<
  Actor<IActionRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>,
  IActionRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;
}
