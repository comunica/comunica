import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type {
  IActionRootRdfSerialize,
  IActorOutputRootRdfSerialize,
  IActorTestRootRdfSerialize,
} from '@comunica/bus-rdf-serialize';
import type { IActionRdfUpdateHypermedia, IActorRdfUpdateHypermediaOutput } from '@comunica/bus-rdf-update-hypermedia';
import { ActorRdfUpdateHypermedia } from '@comunica/bus-rdf-update-hypermedia';
import type { Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import { QuadDestinationSparql } from './QuadDestinationSparql';

/**
 * A comunica SPARQL RDF Update Hypermedia Actor.
 */
export class ActorRdfUpdateHypermediaSparql extends ActorRdfUpdateHypermedia {
  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  public readonly mediatorRdfSerialize: Mediator<
  Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>,
  IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;

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
        this.mediatorRdfSerialize,
      ),
    };
  }
}

export interface IActorRdfUpdateHypermediaSparqlArgs
  extends IActorArgs<IActionRdfUpdateHypermedia, IActorTest, IActorRdfUpdateHypermediaOutput> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;
  mediatorRdfSerialize: Mediator<
  Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>,
  IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;
  checkUrlSuffixSparql: boolean;
  checkUrlSuffixUpdate: boolean;
}
