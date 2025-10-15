import type {
  IActionQuerySourceHypermediaResolve,
  IActorQuerySourceHypermediaResolveOutput,
  IActorQuerySourceHypermediaResolveArgs,
} from '@comunica/bus-query-source-hypermedia-resolve';
import { ActorQuerySourceHypermediaResolve } from '@comunica/bus-query-source-hypermedia-resolve';
import type { MediatorQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid, failTest } from '@comunica/core';
import type { MetadataBindings } from '@comunica/types';
import { Readable } from 'readable-stream';

/**
 * A comunica Force SPARQL Query Source Hypermedia Resolve Actor.
 */
export class ActorQuerySourceHypermediaResolveForceSparql extends ActorQuerySourceHypermediaResolve {
  public readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  public readonly mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;

  public constructor(args: IActorQuerySourceHypermediaResolveForceSparqlArgs) {
    super(args);
  }

  public async test(action: IActionQuerySourceHypermediaResolve): Promise<TestResult<IActorTest>> {
    if (action.forceSourceType === 'sparql' && action.context.get(KeysQueryOperation.querySources)?.length === 1) {
      return passTestVoid();
    }
    return failTest(`${this.name} can only handle a single forced SPARQL source`);
  }

  public async run(action: IActionQuerySourceHypermediaResolve): Promise<IActorQuerySourceHypermediaResolveOutput> {
    // No need to do metadata extraction if we're querying over just a single SPARQL endpoint.
    const quads: Readable = new Readable();
    quads._read = () => {
      quads.push(null);
      return null;
    };
    const metadata: Record<string, any> = (await this.mediatorMetadataAccumulate
      .mediate({ context: action.context, mode: 'initialize' })).metadata;

    // Determine the source
    const { source, dataset } = await this.mediatorQuerySourceIdentifyHypermedia.mediate({
      context: action.context,
      forceSourceType: action.forceSourceType,
      handledDatasets: action.handledDatasets,
      metadata,
      quads,
      url: action.url,
    });

    return { source, metadata: <MetadataBindings> metadata, dataset };
  }
}

export interface IActorQuerySourceHypermediaResolveForceSparqlArgs extends IActorQuerySourceHypermediaResolveArgs {
  /**
   * The metadata accumulate mediator
   */
  mediatorMetadataAccumulate?: MediatorRdfMetadataAccumulate;
  /**
   * The hypermedia resolve mediator
   */
  mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;
}
