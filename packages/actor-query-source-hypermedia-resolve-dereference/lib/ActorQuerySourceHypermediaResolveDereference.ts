import type { IActorDereferenceRdfOutput, MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type {
  IActionQuerySourceHypermediaResolve,
  IActorQuerySourceHypermediaResolveOutput,
  IActorQuerySourceHypermediaResolveArgs,
} from '@comunica/bus-query-source-hypermedia-resolve';
import { ActorQuerySourceHypermediaResolve } from '@comunica/bus-query-source-hypermedia-resolve';
import type { MediatorQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import type { IActorRdfMetadataOutput, MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import { KeysStatistics } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Readable } from 'readable-stream';

/**
 * A comunica Dereference Query Source Hypermedia Resolve Actor.
 */
export class ActorQuerySourceHypermediaResolveDereference extends ActorQuerySourceHypermediaResolve {
  public readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  public readonly mediatorMetadata: MediatorRdfMetadata;
  public readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  public readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  public readonly mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;

  public constructor(args: IActorQuerySourceHypermediaResolveDereferenceArgs) {
    super(args);
  }

  public async test(_action: IActionQuerySourceHypermediaResolve): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionQuerySourceHypermediaResolve): Promise<IActorQuerySourceHypermediaResolveOutput> {
    const context = action.context;
    let url = action.url;
    let quads: RDF.Stream;
    let metadata: Record<string, any>;
    try {
      const dereferenceRdfOutput: IActorDereferenceRdfOutput = await this.mediatorDereferenceRdf
        .mediate({ context, url });
      url = dereferenceRdfOutput.url;

      // Determine the metadata
      const rdfMetadataOutput: IActorRdfMetadataOutput = await this.mediatorMetadata.mediate(
        { context, url, quads: dereferenceRdfOutput.data, triples: dereferenceRdfOutput.metadata?.triples },
      );

      rdfMetadataOutput.data.on('error', () => {
        // Silence errors in the data stream,
        // as they will be emitted again in the metadata stream,
        // and will result in a promise rejection anyways.
        // If we don't do this, we end up with an unhandled error message
      });

      metadata = (await this.mediatorMetadataExtract.mediate({
        context,
        url,
        // The problem appears to be conflicting metadata keys here
        metadata: rdfMetadataOutput.metadata,
        headers: dereferenceRdfOutput.headers,
        requestTime: dereferenceRdfOutput.requestTime,
      })).metadata;
      quads = rdfMetadataOutput.data;

      // Transform quads if needed.
      if (action.transformQuads) {
        quads = await action.transformQuads(quads, <MetadataBindings> metadata);
      }
    } catch (error: unknown) {
      // Make sure that dereference errors are only emitted once an actor really needs the read quads
      // This allows SPARQL endpoints that error on service description fetching to still be source-forcible
      quads = new Readable();
      quads.read = () => {
        setTimeout(() => quads.emit('error', error));
        return null;
      };
      ({ metadata } = await this.mediatorMetadataAccumulate.mediate({ context, mode: 'initialize' }));

      // Log as warning, because the quads above may not always be consumed (e.g. for SPARQL endpoints),
      // so the user would not be notified of something going wrong otherwise.
      this.logWarn(context, `Metadata extraction for ${action.url} failed: ${(<Error>error).message}`);
    }

    // Determine the source
    const { source, dataset } = await this.mediatorQuerySourceIdentifyHypermedia.mediate({
      context,
      forceSourceType: action.forceSourceType,
      handledDatasets: action.handledDatasets,
      metadata,
      quads,
      url,
    });

    if (dataset && action.handledDatasets) {
      // Mark the dataset as applied
      // This is needed to make sure that things like QPF search forms are only applied once,
      // and next page links are followed after that.
      action.handledDatasets[dataset] = true;
    }

    // Track dereference event
    context.get(KeysStatistics.dereferencedLinks)?.updateStatistic({ url: action.url, metadata }, source);

    return { source, metadata: <MetadataBindings> metadata, dataset };
  }
}

export interface IActorQuerySourceHypermediaResolveDereferenceArgs extends IActorQuerySourceHypermediaResolveArgs {
  /**
   * The RDF dereference mediator
   */
  mediatorDereferenceRdf: MediatorDereferenceRdf;
  /**
   * The metadata mediator
   */
  mediatorMetadata: MediatorRdfMetadata;
  /**
   * The metadata extract mediator
   */
  mediatorMetadataExtract: MediatorRdfMetadataExtract;
  /**
   * The metadata accumulate mediator
   */
  mediatorMetadataAccumulate?: MediatorRdfMetadataAccumulate;
  /**
   * The hypermedia resolve mediator
   */
  mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;
}
