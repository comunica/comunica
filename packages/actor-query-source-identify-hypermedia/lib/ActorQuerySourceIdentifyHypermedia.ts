import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { MediatorQuerySourceDereferenceLink } from '@comunica/bus-query-source-dereference-link';
import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import type {
  IActionQuerySourceIdentify,
  IActorQuerySourceIdentifyOutput,
  IActorQuerySourceIdentifyArgs,
} from '@comunica/bus-query-source-identify';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { MediatorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { MediatorRdfResolveHypermediaLinksQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, failTest, passTestVoid } from '@comunica/core';
import type { IActorTest, TestResult } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { QuerySourceHypermedia } from './QuerySourceHypermedia';

/**
 * A comunica Hypermedia Query Source Identify Actor.
 */
export class ActorQuerySourceIdentifyHypermedia extends ActorQuerySourceIdentify {
  /** Mediator for accumulating RDF metadata across sources. */
  public readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  /** Mediator for dereferencing a query source link. */
  public readonly mediatorQuerySourceDereferenceLink: MediatorQuerySourceDereferenceLink;
  /** Mediator for resolving hypermedia links from source metadata. */
  public readonly mediatorRdfResolveHypermediaLinks: MediatorRdfResolveHypermediaLinks;
  /** Mediator for resolving a hypermedia links queue. */
  public readonly mediatorRdfResolveHypermediaLinksQueue: MediatorRdfResolveHypermediaLinksQueue;
  /** Mediator for creating binding context merge handlers. */
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  /** Maximum number of entries in the LRU source cache. */
  public readonly cacheSize: number;
  /** Maximum number of links that can be followed in parallel. */
  public readonly maxIterators: number;

  /**
   * Creates a new hypermedia query source identify actor.
   * @param args Actor arguments including mediators, cache size, and iterator limits.
   */
  public constructor(args: IActorQuerySourceIdentifyHypermediaArgs) {
    super(args);
    this.mediatorMetadataAccumulate = args.mediatorMetadataAccumulate;
    this.mediatorQuerySourceDereferenceLink = args.mediatorQuerySourceDereferenceLink;
    this.mediatorRdfResolveHypermediaLinks = args.mediatorRdfResolveHypermediaLinks;
    this.mediatorRdfResolveHypermediaLinksQueue = args.mediatorRdfResolveHypermediaLinksQueue;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
    this.cacheSize = args.cacheSize;
    this.maxIterators = args.maxIterators;
  }

  /**
   * Tests whether the given query source has a string URL value.
   * @param action The query source identify action.
   * @return A test result that passes when the source value is a string URL.
   */
  public async test(action: IActionQuerySourceIdentify): Promise<TestResult<IActorTest>> {
    if (typeof action.querySourceUnidentified.value !== 'string') {
      return failTest(`${this.name} requires a single query source with a URL value to be present in the context.`);
    }
    return passTestVoid();
  }

  /**
   * Creates a {@link QuerySourceHypermedia} for the identified source URL.
   * @param action The query source identify action.
   * @return The identified query source wrapped in a hypermedia query source.
   */
  public async run(action: IActionQuerySourceIdentify): Promise<IActorQuerySourceIdentifyOutput> {
    const querySourceContext = action.querySourceUnidentified.context ?? new ActionContext();
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    return {
      querySource: {
        source: new QuerySourceHypermedia(
          this.cacheSize,
          { url: <string> action.querySourceUnidentified.value, forceSourceType: action.querySourceUnidentified.type },
          this.maxIterators,
          {
            mediatorMetadataAccumulate: this.mediatorMetadataAccumulate,
            mediatorQuerySourceDereferenceLink: this.mediatorQuerySourceDereferenceLink,
            mediatorRdfResolveHypermediaLinks: this.mediatorRdfResolveHypermediaLinks,
            mediatorRdfResolveHypermediaLinksQueue: this.mediatorRdfResolveHypermediaLinksQueue,
          },
          dataFactory,
          await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context, dataFactory),
        ),
        context: querySourceContext,
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
   * The metadata accumulate mediator
   */
  mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
  /**
   * The mediator for resolving hypermedia sources
   */
  mediatorQuerySourceDereferenceLink: MediatorQuerySourceDereferenceLink;
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
