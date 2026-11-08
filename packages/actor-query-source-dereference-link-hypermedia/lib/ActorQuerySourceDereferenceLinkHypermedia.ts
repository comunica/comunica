import type { IActorDereferenceRdfOutput, MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import {
  ActorQuerySourceDereferenceLink,
} from '@comunica/bus-query-source-dereference-link';
import type {
  IActionQuerySourceDereferenceLink,
  IActorQuerySourceDereferenceLinkOutput,
  IActorQuerySourceDereferenceLinkArgs,
} from '@comunica/bus-query-source-dereference-link';
import type {
  IActorQuerySourceIdentifyHypermediaOutput,
  MediatorQuerySourceIdentifyHypermedia,
} from '@comunica/bus-query-source-identify-hypermedia';
import type { IActorRdfMetadataOutput, MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import { KeysHttp, KeysStatistics } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { IActionContext, ICachePolicy, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Readable } from 'readable-stream';
import { QuerySourceCachePolicyDereferenceWrapper } from './QuerySourceCachePolicyDereferenceWrapper';

/**
 * A comunica Dereference Query Source Hypermedia Resolve Actor.
 */
export class ActorQuerySourceDereferenceLinkHypermedia extends ActorQuerySourceDereferenceLink {
  public readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  public readonly mediatorMetadata: MediatorRdfMetadata;
  public readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  public readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  public readonly mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;
  public readonly sparqlServiceDescriptionTimeout: number;

  public constructor(args: IActorQuerySourceDereferenceLinkHypermediaArgs) {
    super(args);
    this.mediatorDereferenceRdf = args.mediatorDereferenceRdf;
    this.mediatorMetadata = args.mediatorMetadata;
    this.mediatorMetadataExtract = args.mediatorMetadataExtract;
    this.mediatorMetadataAccumulate = args.mediatorMetadataAccumulate;
    this.mediatorQuerySourceIdentifyHypermedia = args.mediatorQuerySourceIdentifyHypermedia;
    this.sparqlServiceDescriptionTimeout = args.sparqlServiceDescriptionTimeout ?? 3000;
  }

  public async test(_action: IActionQuerySourceDereferenceLink): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  protected getDereferenceRdfContext(
    context: IActionContext,
    url: string,
    forceSourceType?: string,
  ): IActionContext {
    const isSparqlServiceDescriptionDereference = forceSourceType === 'sparql' ||
      (!forceSourceType && (url.endsWith('/sparql') || url.endsWith('/sparql/')));
    if (
      this.sparqlServiceDescriptionTimeout > 0 &&
      isSparqlServiceDescriptionDereference
    ) {
      const existingTimeout = context.get(KeysHttp.httpTimeout);
      const effectiveTimeout = existingTimeout !== undefined && existingTimeout > 0 ?
        Math.min(existingTimeout, this.sparqlServiceDescriptionTimeout) :
        this.sparqlServiceDescriptionTimeout;
      if (effectiveTimeout === existingTimeout) {
        return context;
      }
      return context.set(KeysHttp.httpTimeout, effectiveTimeout);
    }
    return context;
  }

  public async run(action: IActionQuerySourceDereferenceLink): Promise<IActorQuerySourceDereferenceLinkOutput> {
    const context = action.link.context ? action.context.merge(action.link.context) : action.context;
    let url = action.link.url;
    let quads: RDF.Stream;
    let metadata: Record<string, any>;
    let cachePolicy: ICachePolicy<IActionQuerySourceDereferenceLink> | undefined;
    let identified: Promise<IActorQuerySourceIdentifyHypermediaOutput> | undefined;
    try {
      const dereferenceRdfContext = this.getDereferenceRdfContext(context, url, action.link.forceSourceType);
      const dereferenceRdfOutput: IActorDereferenceRdfOutput = await this.mediatorDereferenceRdf
        .mediate({ context: dereferenceRdfContext, url });
      url = dereferenceRdfOutput.url;
      if (dereferenceRdfOutput.cachePolicy) {
        cachePolicy = new QuerySourceCachePolicyDereferenceWrapper(dereferenceRdfOutput.cachePolicy);
      }

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

      quads = rdfMetadataOutput.data;

      // Transform quads if needed.
      if (action.link.transform) {
        quads = await action.link.transform(quads);
      }

      // A source forced to be a file does not need its metadata to be identified, so it is identified while its
      // metadata is extracted. Its quads are then stored as they come in, instead of being kept in memory until then.
      if (action.link.forceSourceType === 'file') {
        identified = this.mediatorQuerySourceIdentifyHypermedia.mediate({
          context,
          forceSourceType: action.link.forceSourceType,
          handledDatasets: action.handledDatasets,
          metadata: {},
          quads,
          url,
        });
        // Its errors are also those of the metadata extraction, which reports them
        identified.catch(() => {
          // Do nothing
        });
      }

      metadata = (await this.mediatorMetadataExtract.mediate({
        context,
        url,
        // The problem appears to be conflicting metadata keys here
        metadata: rdfMetadataOutput.metadata,
        headers: dereferenceRdfOutput.headers,
        requestTime: dereferenceRdfOutput.requestTime,
      })).metadata;
    } catch (error: unknown) {
      identified = undefined;
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
      this.logWarn(context, `Metadata extraction for ${action.link.url} failed: ${(<Error>error).message}`);
    }

    // Determine the source
    const { source, dataset } = await (identified ?? this.mediatorQuerySourceIdentifyHypermedia.mediate({
      context,
      forceSourceType: action.link.forceSourceType,
      handledDatasets: action.handledDatasets,
      metadata,
      quads,
      url,
    }));

    if (dataset && action.handledDatasets) {
      // Mark the dataset as applied
      // This is needed to make sure that things like QPF search forms are only applied once,
      // and next page links are followed after that.
      action.handledDatasets[dataset] = true;
    }

    // Track dereference event
    context.get(KeysStatistics.dereferencedLinks)?.updateStatistic({ url: action.link.url, metadata }, source);

    return { source, metadata: <MetadataBindings> metadata, dataset, cachePolicy };
  }
}

export interface IActorQuerySourceDereferenceLinkHypermediaArgs extends IActorQuerySourceDereferenceLinkArgs {
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
  mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  /**
   * The hypermedia resolve mediator
   */
  mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;
  /**
   * Timeout in ms for dereferencing SPARQL service descriptions.
   * @range {integer}
   * @default {3000}
   */
  sparqlServiceDescriptionTimeout?: number;
}
