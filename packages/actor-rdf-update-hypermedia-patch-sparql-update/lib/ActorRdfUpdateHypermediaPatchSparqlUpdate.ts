import type { MediatorHttp } from '@comunica/bus-http';
import type {
  IActionRdfUpdateHypermedia,
  IActorRdfUpdateHypermediaArgs,
  IActorRdfUpdateHypermediaOutput,
} from '@comunica/bus-rdf-update-hypermedia';
import { ActorRdfUpdateHypermedia } from '@comunica/bus-rdf-update-hypermedia';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { QuadDestinationPatchSparqlUpdate } from './QuadDestinationPatchSparqlUpdate';

/**
 * A comunica Patch SPARQL Update RDF Update Hypermedia Actor.
 */
export class ActorRdfUpdateHypermediaPatchSparqlUpdate extends ActorRdfUpdateHypermedia {
  public readonly mediatorHttp: MediatorHttp;

  public constructor(args: IActorRdfUpdateHypermediaPatchSparqlUpdateArgs) {
    super(args, 'patchSparqlUpdate');
  }

  public async testMetadata(action: IActionRdfUpdateHypermedia): Promise<TestResult<IActorTest>> {
    if (!action.forceDestinationType && !action.metadata.patchSparqlUpdate) {
      return failTest(`Actor ${this.name} could not detect a destination with 'application/sparql-update' as 'Accept-Patch' header.`);
    }
    if (!action.forceDestinationType && !action.exists) {
      return failTest(`Actor ${this.name} can only patch a destination that already exists.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionRdfUpdateHypermedia): Promise<IActorRdfUpdateHypermediaOutput> {
    this.logInfo(action.context, `Identified as patchSparqlUpdate destination: ${action.url}`);
    return {
      destination: new QuadDestinationPatchSparqlUpdate(
        action.url,
        action.context,
        this.mediatorHttp,
      ),
    };
  }
}

export interface IActorRdfUpdateHypermediaPatchSparqlUpdateArgs extends IActorRdfUpdateHypermediaArgs {
  /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
}
