import type {
  IActionQuerySourceDereferenceLink,
  IActorQuerySourceDereferenceLinkOutput,
  IActorQuerySourceDereferenceLinkArgs,
} from '@comunica/bus-query-source-dereference-link';
import { ActorQuerySourceDereferenceLink } from '@comunica/bus-query-source-dereference-link';
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
export class ActorQuerySourceDereferenceLinkForceSparql extends ActorQuerySourceDereferenceLink {
  public readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  public readonly mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;

  public constructor(args: IActorQuerySourceDereferenceLinkForceSparqlArgs) {
    super(args);
    this.mediatorMetadataAccumulate = args.mediatorMetadataAccumulate;
    this.mediatorQuerySourceIdentifyHypermedia = args.mediatorQuerySourceIdentifyHypermedia;
  }

  public async test(action: IActionQuerySourceDereferenceLink): Promise<TestResult<IActorTest>> {
    if (action.link.forceSourceType === 'sparql' && action.context.get(KeysQueryOperation.querySources)?.length === 1) {
      return passTestVoid();
    }
    return failTest(`${this.name} can only handle a single forced SPARQL source`);
  }

  public async run(action: IActionQuerySourceDereferenceLink): Promise<IActorQuerySourceDereferenceLinkOutput> {
    const context = action.link.context ? action.context.merge(action.link.context) : action.context;

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
      context,
      forceSourceType: action.link.forceSourceType,
      handledDatasets: action.handledDatasets,
      metadata,
      quads,
      url: action.link.url,
    });

    return { source, metadata: <MetadataBindings> metadata, dataset };
  }
}

export interface IActorQuerySourceDereferenceLinkForceSparqlArgs extends IActorQuerySourceDereferenceLinkArgs {
  /**
   * The metadata accumulate mediator
   */
  mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  /**
   * The hypermedia resolve mediator
   */
  mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;
}
