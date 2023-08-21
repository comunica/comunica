import type { MediatorHttp } from '@comunica/bus-http';
import type { IActionRdfResolveHypermedia, IActorRdfResolveHypermediaOutput,
  IActorRdfResolveHypermediaTest, IActorRdfResolveHypermediaArgs } from '@comunica/bus-rdf-resolve-hypermedia';
import { ActorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import { RdfSourceSparql } from './RdfSourceSparql';

/**
 * A comunica SPARQL RDF Resolve Hypermedia Actor.
 */
export class ActorRdfResolveHypermediaSparql extends ActorRdfResolveHypermedia {
  public readonly mediatorHttp: MediatorHttp;
  public readonly checkUrlSuffix: boolean;
  public readonly forceHttpGet: boolean;
  public readonly cacheSize: number;

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
    this.logInfo(action.context, `Identified ${action.url} as sparql source with service URL: ${action.metadata.sparqlService || action.url}`);
    const source = new RdfSourceSparql(
      action.metadata.sparqlService || action.url,
      action.context,
      this.mediatorHttp,
      this.forceHttpGet,
      this.cacheSize,
    );
    return { source };
  }
}

export interface IActorRdfResolveHypermediaSparqlArgs extends IActorRdfResolveHypermediaArgs {
  /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
  /**
   * If URLs ending with '/sparql' should also be considered SPARQL endpoints.
   * @default {true}
   */
  checkUrlSuffix: boolean;
  /**
   * If queries should be sent via HTTP GET instead of POST
   * @default {false}
   */
  forceHttpGet: boolean;
  /**
   * The cache size for COUNT queries.
   * @range {integer}
   * @default {1024}
   */
  cacheSize?: number;
}
