import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type { IActionRdfResolveHypermedia,
  IActorRdfResolveHypermediaOutput, IActorRdfResolveHypermediaTest } from '@comunica/bus-rdf-resolve-hypermedia';
import { ActorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import type { Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';

import { RdfSourceSparql } from './RdfSourceSparql';

/**
 * A comunica SPARQL RDF Resolve Hypermedia Actor.
 */
export class ActorRdfResolveHypermediaSparql extends ActorRdfResolveHypermedia {
  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  public readonly checkUrlSuffix: boolean;

  public constructor(args: IActorRdfResolveHypermediaSparqlArgs) {
    super(args, 'sparql');
  }

  public async testMetadata(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaTest> {
    if (!action.forceSourceType && !action.metadata.sparqlService &&
      !(this.checkUrlSuffix && action.url.endsWith('/sparql'))) {
      throw new Error(`Actor ${this.name} could not detect a SPARQL service description or URL ending on /sparql.`);
    }
    return { filterFactor: 1 };
  }

  public async run(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaOutput> {
    this.logInfo(action.context, `Identified as sparql source: ${action.url}`);
    const source = new RdfSourceSparql(action.metadata.sparqlService || action.url, action.context, this.mediatorHttp);
    return { source };
  }
}

export interface IActorRdfResolveHypermediaSparqlArgs
  extends IActorArgs<IActionRdfResolveHypermedia, IActorRdfResolveHypermediaTest, IActorRdfResolveHypermediaOutput> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;
  checkUrlSuffix: boolean;
}
