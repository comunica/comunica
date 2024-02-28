import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import type {
  IActionQuerySourceIdentify,
  IActorQuerySourceIdentifyOutput,
  IActorQuerySourceIdentifyArgs,
} from '@comunica/bus-query-source-identify';
import type { MediatorQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import type { MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysQuerySourceIdentify } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActorTest } from '@comunica/core';
import { QuerySourceHypermedia } from './QuerySourceHypermedia';

/**
 * A comunica Hypermedia Query Source Identify Actor.
 */
export class ActorQuerySourceIdentifyHypermedia extends ActorQuerySourceIdentify {
  public readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  public readonly mediatorMetadata: MediatorRdfMetadata;
  public readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  public readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  public readonly mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;
  public readonly mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  public readonly mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  public readonly cacheSize: number;
  public readonly maxIterators: number;
  public readonly aggregateTraversalStore: boolean;

  public constructor(args: IActorQuerySourceIdentifyHypermediaArgs) {
    super(args);
  }

  public async test(action: IActionQuerySourceIdentify): Promise<IActorTest> {
    if (typeof action.querySourceUnidentified.value !== 'string') {
      throw new TypeError(`${this.name} requires a single query source with a URL value to be present in the context.`);
    }
    return true;
  }

  public async run(action: IActionQuerySourceIdentify): Promise<IActorQuerySourceIdentifyOutput> {
    return {
      querySource: {
        source: new QuerySourceHypermedia(
          this.cacheSize,
          <string> action.querySourceUnidentified.value,
          action.querySourceUnidentified.type,
          this.maxIterators,
          this.aggregateTraversalStore &&
          Boolean(action.querySourceUnidentified.context?.get(KeysQuerySourceIdentify.traverse)),
          {
            mediatorMetadata: this.mediatorMetadata,
            mediatorMetadataExtract: this.mediatorMetadataExtract,
            mediatorMetadataAccumulate: this.mediatorMetadataAccumulate,
            mediatorDereferenceRdf: this.mediatorDereferenceRdf,
            mediatorQuerySourceIdentifyHypermedia: this.mediatorQuerySourceIdentifyHypermedia,
            mediatorRdfResolveHypermediaLinks: this.mediatorRdfResolveHypermediaLinks,
            mediatorRdfResolveHypermediaLinksQueue: this.mediatorRdfResolveHypermediaLinksQueue,
          },
          warningMessage => this.logWarn(action.context, warningMessage),
          await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context),
        ),
        context: action.querySourceUnidentified.context ?? new ActionContext(),
      },
    };
  }
}

export interface IActorQuerySourceIdentifyHypermediaArgs extends IActorQuerySourceIdentifyArgs {
  /**
   * The maximum number of entries in the LRU cache, set to 0 to disable.
   * @range {integer}
   * @default {100}
   */
  cacheSize: number;
  /**
   * The maximum number of links that can be followed in parallel.
   * @default {64}
   */
  maxIterators: number;
  /**
   * If all discovered quads across all links from a traversal source should be indexed in an aggregated store,
   * to speed up later calls.
   * This only applies to sources annotated with KeysQuerySourceIdentify.traverse.
   * @default {true}
   */
  aggregateTraversalStore: boolean;
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
  /**
   * The hypermedia links resolve mediator
   */
  mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  /**
   * The hypermedia links queue resolve mediator
   */
  mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
