import type { MediatorHttp } from '@comunica/bus-http';
import type { IActionRdfUpdateHypermedia, IActorRdfUpdateHypermediaOutput,
  IActorRdfUpdateHypermediaArgs } from '@comunica/bus-rdf-update-hypermedia';
import { ActorRdfUpdateHypermedia } from '@comunica/bus-rdf-update-hypermedia';
import type { IActorTest } from '@comunica/core';
import { QuadDestinationSparql } from './QuadDestinationSparql';

/**
 * A comunica SPARQL RDF Update Hypermedia Actor.
 */
export class ActorRdfUpdateHypermediaSparql extends ActorRdfUpdateHypermedia {
  public readonly mediatorHttp: MediatorHttp;
  public readonly checkUrlSuffixSparql: boolean;
  public readonly checkUrlSuffixUpdate: boolean;

  public constructor(args: IActorRdfUpdateHypermediaSparqlArgs) {
    super(args, 'sparql');
  }

  public async testMetadata(action: IActionRdfUpdateHypermedia): Promise<IActorTest> {
    if (!action.forceDestinationType && !action.metadata.sparqlService &&
      !(this.checkUrlSuffixSparql && action.url.endsWith('/sparql')) &&
      !(this.checkUrlSuffixUpdate && action.url.endsWith('/update'))) {
      throw new Error(`Actor ${this.name} could not detect a SPARQL service description or URL ending on /sparql or /update.`);
    }
    return true;
  }

  public async run(action: IActionRdfUpdateHypermedia): Promise<IActorRdfUpdateHypermediaOutput> {
    this.logInfo(action.context, `Identified as sparql destination: ${action.url}`);
    return {
      destination: new QuadDestinationSparql(
        action.metadata.sparqlService || action.url,
        action.context,
        this.mediatorHttp,
      ),
    };
  }
}

export interface IActorRdfUpdateHypermediaSparqlArgs extends IActorRdfUpdateHypermediaArgs {
  /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
  /**
   * If URLs ending with '/sparql' should also be considered SPARQL endpoints.
   * @default {true}
   */
  checkUrlSuffixSparql: boolean;
  /**
   * If URLs ending with '/update' should also be considered SPARQL endpoints.
   * @default {true}
   */
  checkUrlSuffixUpdate: boolean;
}
