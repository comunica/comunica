import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type {
  IActionRdfSerialize,
  IActionRootRdfSerialize, IActorOutputRootRdfSerialize,
  IActorTestRootRdfSerialize,
} from '@comunica/bus-rdf-serialize';
import type { IActionRdfUpdateHypermedia, IActorRdfUpdateHypermediaOutput } from '@comunica/bus-rdf-update-hypermedia';
import { ActorRdfUpdateHypermedia } from '@comunica/bus-rdf-update-hypermedia';
import type { IActorArgs, IActorTest, Actor, Mediator } from '@comunica/core';
import { QuadDestinationPatchSparqlUpdate } from './QuadDestinationPatchSparqlUpdate';

/**
 * A comunica Patch SPARQL Update RDF Update Hypermedia Actor.
 */
export class ActorRdfUpdateHypermediaPatchSparqlUpdate extends ActorRdfUpdateHypermedia {
  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  public readonly mediatorRdfSerialize: Mediator<
  Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>,
  IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;

  public constructor(args: IActorRdfUpdateHypermediaPatchSparqlUpdateArgs) {
    super(args, 'patchSparqlUpdate');
  }

  public async testMetadata(action: IActionRdfUpdateHypermedia): Promise<IActorTest> {
    if (!action.forceDestinationType && !action.metadata.patchSparqlUpdate) {
      throw new Error(`Actor ${this.name} could not detect a destination with 'application/sparql-update' as 'Accept-Patch' header.`);
    }
    if (!action.exists) {
      throw new Error(`Actor ${this.name} can only patch a destination that already exists.`);
    }
    return true;
  }

  public async run(action: IActionRdfUpdateHypermedia): Promise<IActorRdfUpdateHypermediaOutput> {
    this.logInfo(action.context, `Identified as patchSparqlUpdate destination: ${action.url}`);
    return {
      destination: new QuadDestinationPatchSparqlUpdate(
        action.url,
        action.context,
        this.mediatorHttp,
        this.mediatorRdfSerialize,
      ),
    };
  }
}

export interface IActorRdfUpdateHypermediaPatchSparqlUpdateArgs
  extends IActorArgs<IActionRdfUpdateHypermedia, IActorTest, IActorRdfUpdateHypermediaOutput> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;
  mediatorRdfSerialize: Mediator<
  Actor<IActionRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>,
  IActionRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;
}
