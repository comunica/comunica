import type { MediatorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import {
  CONTEXT_KEYS_QUERY_SOURCE_CACHE,
  KeysDereference,
  KeysInitQuery,
  KeysQueryOperation,
  KeysStatistics,
} from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid, ActionContext } from '@comunica/core';
import type {
  IActionContext,
  ILink,
  IQuerySourceUnidentifiedExpanded,
  IQuerySourceWrapper,
  IStatisticBase,
  QuerySourceUnidentified,
  QuerySourceUnidentifiedExpanded,
} from '@comunica/types';
import { Algebra, algebraUtils } from '@comunica/utils-algebra';
import { passFullOperationToSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import { termToString } from 'rdf-string';

// Cache qualifier prefix for sources that are identified as SERVICE targets,
// as these are identified with a different source context than regular sources.
const QUALIFIER_PREFIX_SERVICE = 'service:';

/**
 * A comunica Query Source Identify Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationQuerySourceIdentify extends ActorOptimizeQueryOperation {
  public readonly serviceForceSparqlEndpoint: boolean;
  public readonly cacheSize: number;
  public readonly httpInvalidator: ActorHttpInvalidateListenable;
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
  public readonly mediatorContextPreprocess: MediatorContextPreprocess;
  /**
   * A cache of identified sources, indexed by url, and then by qualifier (see {@link getCacheQualifier}),
   * as the same url may be identified into different sources.
   */
  public readonly cache?: LRUCache<string, LRUCache<string, Promise<IQuerySourceWrapper>>>;
  // Identifiers of the objects in source contexts, as objects can only be represented in qualifiers by their identity.
  private readonly cacheQualifierObjectIds = new WeakMap<object, number>();
  private cacheQualifierObjectIdCounter = 0;

  public constructor(args: IActorOptimizeQueryOperationQuerySourceIdentifyArgs) {
    super(args);
    this.serviceForceSparqlEndpoint = args.serviceForceSparqlEndpoint;
    this.cacheSize = args.cacheSize;
    this.httpInvalidator = args.httpInvalidator;
    this.mediatorQuerySourceIdentify = args.mediatorQuerySourceIdentify;
    this.mediatorContextPreprocess = args.mediatorContextPreprocess;
    this.cache = this.cacheSize ? new LRUCache<string, any>({ max: this.cacheSize }) : undefined;
    const cache = this.cache;
    if (cache) {
      this.httpInvalidator.addInvalidateListener(
        ({ url }: IActionHttpInvalidate) => {
          if (url) {
            cache.delete(url);
          } else {
            cache.clear();
          }
        },
      );
    }
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    let context = action.context;

    // Rewrite sources
    let querySources: IQuerySourceWrapper[] | undefined;
    if (context.has(KeysInitQuery.querySourcesUnidentified)) {
      const querySourcesUnidentified: QuerySourceUnidentified[] = action.context
        .get(KeysInitQuery.querySourcesUnidentified)!;
      const querySourcesUnidentifiedExpanded = await Promise.all(querySourcesUnidentified
        .map(querySource => this.expandSource(querySource)));
      querySources = await Promise.all(querySourcesUnidentifiedExpanded
        .map(async querySourceUnidentified => this.identifySource(querySourceUnidentified, action.context)));

      // When identifying sources in preprocess actor, we record this as a dereference seed document event
      const statisticDereferenceLinks: IStatisticBase<ILink> | undefined = action.context
        .get(KeysStatistics.dereferencedLinks);
      if (statisticDereferenceLinks) {
        for (const querySource of querySources) {
          statisticDereferenceLinks.updateStatistic({
            url: <string> querySource.source.referenceValue,
            metadata: {
              seed: true,
            },
          }, querySource.source);
        }
      }

      context = context
        .delete(KeysInitQuery.querySourcesUnidentified)
        .set(KeysQueryOperation.querySources, querySources);
    }

    // Identify sources of SERVICE targets, unless the whole query is passed to the source (e.g. for SPARQL endpoints)
    if (!await passFullOperationToSource(action.operation, querySources ?? [], context)) {
      const services: Set<string> = new Set();
      algebraUtils.visitOperation(action.operation, {
        [Algebra.Types.SERVICE]: {
          // Nested SERVICE clauses are delegated to their parent SERVICE target, so they need no source here.
          preVisitor: () => ({ continue: false }),
          visitor: (serviceOperation) => {
            if (serviceOperation.name.termType === 'NamedNode') {
              services.add(serviceOperation.name.value);
            }
          },
        },
      });
      // Unless explicitly allowed, SERVICE targets may not be dereferenced from the local file system,
      // as queries from untrusted parties could otherwise read arbitrary local files.
      const serviceContext = context.get(KeysInitQuery.serviceAllowFileTargets) ?
        undefined :
        new ActionContext().set(KeysDereference.blockFileAccess, true);
      const serviceSources: Record<string, IQuerySourceWrapper> = Object.fromEntries(await Promise.all([ ...services ]
        .map(async service => [ service, await this.identifySource({
          type: this.serviceForceSparqlEndpoint ? 'sparql' : undefined,
          value: service,
          context: serviceContext,
        }, context, QUALIFIER_PREFIX_SERVICE) ])));
      if (services.size > 0) {
        context = context.set(KeysQueryOperation.serviceSources, serviceSources);
      }
    }

    return { context, operation: action.operation };
  }

  public async expandSource(querySource: QuerySourceUnidentified): Promise<QuerySourceUnidentifiedExpanded> {
    if (typeof querySource === 'string' || 'match' in querySource) {
      return { value: querySource };
    }
    return {
      ...<Omit<IQuerySourceUnidentifiedExpanded, 'context'>>querySource,
      context: (await this.mediatorContextPreprocess.mediate({
        context: ActionContext.ensureActionContext(querySource.context ?? {}),
      })).context,
    };
  }

  public identifySource(
    querySourceUnidentified: QuerySourceUnidentifiedExpanded,
    context: IActionContext,
    cacheQualifierPrefix = '',
  ): Promise<IQuerySourceWrapper> {
    let sourcePromise: Promise<IQuerySourceWrapper> | undefined;

    // Try to read from cache
    // Only sources based on string values (e.g. URLs) are supported!
    const url = typeof querySourceUnidentified.value === 'string' ? querySourceUnidentified.value : undefined;
    let qualifier: string | undefined;
    if (url !== undefined && this.cache) {
      qualifier = cacheQualifierPrefix + this.getCacheQualifier(querySourceUnidentified);
      sourcePromise = this.cache.get(url)?.get(qualifier);
    }

    // If not in cache, identify the source
    if (!sourcePromise) {
      sourcePromise = this.mediatorQuerySourceIdentify.mediate({ querySourceUnidentified, context })
        .then(({ querySource }) => querySource);

      // Set in cache
      if (url !== undefined && this.cache) {
        let sourcesForUrl = this.cache.get(url);
        if (!sourcesForUrl) {
          sourcesForUrl = new LRUCache<string, Promise<IQuerySourceWrapper>>({ max: this.cacheSize });
          this.cache.set(url, sourcesForUrl);
        }
        sourcesForUrl.set(qualifier!, sourcePromise);
      }
    }

    return sourcePromise;
  }

  /**
   * Determine the qualifier under which an identified source is cached for its url.
   *
   * The qualifier contains everything that can make the same url identify into a different source:
   * its forced type, and the values of the cache-relevant keys in its source context
   * (see {@link CONTEXT_KEYS_QUERY_SOURCE_CACHE}).
   * This ensures that a source is only reused by queries that pass an equivalent source.
   *
   * @param querySourceUnidentified An unidentified source.
   * @return The qualifier, which is empty for sources without forced type and cache-relevant source context.
   */
  public getCacheQualifier(querySourceUnidentified: QuerySourceUnidentifiedExpanded): string {
    const contextEntries: [string, CacheQualifierValue][] = [];
    for (const key of CONTEXT_KEYS_QUERY_SOURCE_CACHE) {
      const value: unknown = querySourceUnidentified.context?.get(key);
      if (value !== undefined) {
        contextEntries.push([ key.name, this.getCacheQualifierValue(value) ]);
      }
    }

    if (!querySourceUnidentified.type && contextEntries.length === 0) {
      return '';
    }
    return JSON.stringify([ querySourceUnidentified.type ?? null, contextEntries ]);
  }

  /**
   * Represent a source context value in a cache qualifier.
   * RDF terms and primitive values are represented by their value.
   * Other objects (such as fetch functions or proxy handlers) are represented by their identity,
   * as they can not be compared by value.
   * @param value A source context value.
   */
  protected getCacheQualifierValue(value: unknown): CacheQualifierValue {
    if (typeof value === 'function' || (typeof value === 'object' && value !== null)) {
      if (typeof (<RDF.Term> value).termType === 'string') {
        return termToString(<RDF.Term> value);
      }
      let id = this.cacheQualifierObjectIds.get(value);
      if (id === undefined) {
        id = this.cacheQualifierObjectIdCounter++;
        this.cacheQualifierObjectIds.set(value, id);
      }
      return { object: id };
    }
    return <CacheQualifierValue> value;
  }
}

type CacheQualifierValue = string | number | boolean | null | { object: number };

export interface IActorOptimizeQueryOperationQuerySourceIdentifyArgs extends IActorOptimizeQueryOperationArgs {
  /**
   * If the SERVICE target should be assumed to be a SPARQL endpoint.
   * @default {false}
   */
  serviceForceSparqlEndpoint: boolean;
  /**
   * The maximum number of urls in the LRU cache, and of sources per url, set to 0 to disable.
   * @range {integer}
   * @default {100}
   */
  cacheSize: number;
  /* eslint-disable max-len */
  /**
   * An actor that listens to HTTP invalidation events
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^5.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /* eslint-enable max-len */
  /**
   * Mediator for identifying query sources.
   */
  mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
  /**
   * The context processing combinator
   */
  mediatorContextPreprocess: MediatorContextPreprocess;
}
