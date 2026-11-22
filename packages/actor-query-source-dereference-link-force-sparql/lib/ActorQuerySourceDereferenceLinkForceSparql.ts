import type {
  IActionQuerySourceDereferenceLink,
  IActorQuerySourceDereferenceLinkOutput,
  IActorQuerySourceDereferenceLinkArgs,
  MediatorQuerySourceDereferenceLink,
} from '@comunica/bus-query-source-dereference-link';
import { ActorQuerySourceDereferenceLink } from '@comunica/bus-query-source-dereference-link';
import type { MediatorQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { ActionContextKey, passTestVoid, failTest } from '@comunica/core';
import type { MetadataBindings } from '@comunica/types';
import { Readable } from 'readable-stream';

/**
 * A comunica Force SPARQL Query Source Dereference Link Actor.
 *
 * It identifies a forced SPARQL source without waiting for its service description.
 * For a single source, the service description is not needed.
 * For multiple sources, if serviceDescriptionsInBackground is enabled,
 * the service description is fetched in the background, and passed to the source once it arrives,
 * so that its VoID description can be used from then on.
 * Endpoints without a usable service description are remembered, so it is not fetched again.
 */
export class ActorQuerySourceDereferenceLinkForceSparql extends ActorQuerySourceDereferenceLink {
  public static readonly KEY_SERVICE_DESCRIPTION = new ActionContextKey<boolean>(
    '@comunica/actor-query-source-dereference-link-force-sparql:serviceDescription',
  );

  public readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  public readonly mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;
  public readonly mediatorQuerySourceDereferenceLink?: MediatorQuerySourceDereferenceLink;
  public readonly serviceDescriptionsInBackground: boolean;
  /**
   * The endpoints of which the service description could not be used.
   */
  protected readonly uselessServiceDescriptions = new Map<string, boolean>();

  public constructor(args: IActorQuerySourceDereferenceLinkForceSparqlArgs) {
    super(args);
    this.mediatorMetadataAccumulate = args.mediatorMetadataAccumulate;
    this.mediatorQuerySourceIdentifyHypermedia = args.mediatorQuerySourceIdentifyHypermedia;
    this.mediatorQuerySourceDereferenceLink = args.mediatorQuerySourceDereferenceLink;
    this.serviceDescriptionsInBackground = args.serviceDescriptionsInBackground ?? false;
  }

  public async test(action: IActionQuerySourceDereferenceLink): Promise<TestResult<IActorTest>> {
    if (action.link.forceSourceType !== 'sparql') {
      return failTest(`${this.name} can only handle forced SPARQL sources`);
    }
    if (action.context.get(KeysQueryOperation.querySources)?.length === 1) {
      return passTestVoid();
    }
    if (this.serviceDescriptionsInBackground && this.mediatorQuerySourceDereferenceLink &&
      !action.context.has(ActorQuerySourceDereferenceLinkForceSparql.KEY_SERVICE_DESCRIPTION)) {
      return passTestVoid();
    }
    return failTest(`${this.name} can only handle a single forced SPARQL source`);
  }

  public async run(action: IActionQuerySourceDereferenceLink): Promise<IActorQuerySourceDereferenceLinkOutput> {
    const context = action.link.context ? action.context.merge(action.link.context) : action.context;

    // No need to wait for metadata extraction
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

    if (action.context.get(KeysQueryOperation.querySources)?.length !== 1 &&
      !this.uselessServiceDescriptions.has(action.link.url) &&
      typeof (<any> source).setServiceDescriptionMetadata === 'function') {
      this.fetchServiceDescription(action, (<any> source).setServiceDescriptionMetadata.bind(source));
    }

    return { source, metadata: <MetadataBindings> metadata, dataset };
  }

  /**
   * Fetch the service description of a source in the background, through the other dereference link actors.
   * @param action The dereference link action.
   * @param onMetadata Called with the metadata of a usable service description.
   */
  protected fetchServiceDescription(
    action: IActionQuerySourceDereferenceLink,
    onMetadata: (metadata: Record<string, any>) => void,
  ): void {
    this.mediatorQuerySourceDereferenceLink!.mediate({
      ...action,
      context: action.context.set(ActorQuerySourceDereferenceLinkForceSparql.KEY_SERVICE_DESCRIPTION, true),
    }).then(
      ({ metadata }) => {
        if (metadata.sparqlService || metadata.datasets) {
          onMetadata(metadata);
        } else {
          this.uselessServiceDescriptions.set(action.link.url, true);
        }
      },
      () => this.uselessServiceDescriptions.set(action.link.url, true),
    );
  }
}

export interface IActorQuerySourceDereferenceLinkForceSparqlArgs extends IActorQuerySourceDereferenceLinkArgs {
  mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;
  /**
   * The mediator to fetch service descriptions in the background with.
   */
  mediatorQuerySourceDereferenceLink?: MediatorQuerySourceDereferenceLink;
  /**
   * If service descriptions of multiple forced SPARQL sources are fetched in the background,
   * instead of before the sources are used.
   * @default {false}
   */
  serviceDescriptionsInBackground?: boolean;
}
