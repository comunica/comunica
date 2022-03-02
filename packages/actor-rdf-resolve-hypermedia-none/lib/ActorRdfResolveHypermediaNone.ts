import { RdfJsQuadSource } from '@comunica/actor-rdf-resolve-quad-pattern-rdfjs-source';
import type {
  IActionRdfResolveHypermedia, IActorRdfResolveHypermediaArgs,
  IActorRdfResolveHypermediaOutput, IActorRdfResolveHypermediaTest,
} from '@comunica/bus-rdf-resolve-hypermedia';
import { ActorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import { storeStream } from 'rdf-store-stream';

/**
 * A comunica None RDF Resolve Hypermedia Actor.
 */
export class ActorRdfResolveHypermediaNone extends ActorRdfResolveHypermedia {
  public constructor(args: IActorRdfResolveHypermediaArgs) {
    super(args, 'file');
  }

  public async testMetadata(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaTest> {
    return { filterFactor: 0 };
  }

  public async run(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaOutput> {
    this.logInfo(action.context, `Identified as file source: ${action.url}`);
    return { source: new RdfJsQuadSource(await storeStream(action.quads)) };
  }
}
