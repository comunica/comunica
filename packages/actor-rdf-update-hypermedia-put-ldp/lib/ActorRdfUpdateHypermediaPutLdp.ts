import type { MediatorHttp } from '@comunica/bus-http';
import type { MediatorRdfSerializeHandle, MediatorRdfSerializeMediaTypes } from '@comunica/bus-rdf-serialize';
import type { IActionRdfUpdateHypermedia, IActorRdfUpdateHypermediaOutput,
  IActorRdfUpdateHypermediaArgs } from '@comunica/bus-rdf-update-hypermedia';
import { ActorRdfUpdateHypermedia } from '@comunica/bus-rdf-update-hypermedia';
import type { IActorTest } from '@comunica/core';
import { QuadDestinationPutLdp } from './QuadDestinationPutLdp';

/**
 * A comunica Post LDP RDF Update Hypermedia Actor.
 */
export class ActorRdfUpdateHypermediaPutLdp extends ActorRdfUpdateHypermedia {
  public readonly mediatorHttp: MediatorHttp;
  public readonly mediatorRdfSerializeMediatypes: MediatorRdfSerializeMediaTypes;
  public readonly mediatorRdfSerialize: MediatorRdfSerializeHandle;

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

export interface IActorRdfUpdateHypermediaPostLdpArgs extends IActorRdfUpdateHypermediaArgs {
  /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
  /**
   * The RDF Serialize mediator for collecting media types
   */
  mediatorRdfSerializeMediatypes: MediatorRdfSerializeMediaTypes;
  /**
   * The RDF Serialize mediator for handling serialization
   */
  mediatorRdfSerialize: MediatorRdfSerializeHandle;
}
