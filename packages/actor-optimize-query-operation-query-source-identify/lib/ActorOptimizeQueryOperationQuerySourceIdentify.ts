import type { MediatorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysDereference, KeysInitQuery, KeysQueryOperation, KeysStatistics } from '@comunica/context-entries';
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

// Cache key prefix for sources that are identified as SERVICE targets,
// as these are identified with a different source context than regular sources.
const KEY_PREFIX_SERVICE = 'service:';
// Cache key separator between a source's qualifiers (its forced type and source context) and its url,
// as the same url may be identified into a different source depending on these,
// e.g. a source that is exposed under a named graph contains different data than the plain source,
// and a source with authentication may not be used by queries that do not provide it.
// Whitespace can not occur in IRIs, nor unescaped in the JSON-serialized qualifiers, so this never clashes with a url.
const KEY_SEPARATOR_QUALIFIERS = '\n';

/**
 * A comunica Query Source Identify Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationQuerySourceIdentify extends ActorOptimizeQueryOperation {
  public readonly serviceForceSparqlEndpoint: boolean;
  public readonly cacheSize: number;
  public readonly httpInvalidator: ActorHttpInvalidateListenable;
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
  public readonly mediatorContextPreprocess: MediatorContextPreprocess;
  public readonly cache?: LRUCache<string, Promise<IQuerySourceWrapper>>;
  // If the cache may hold sources with qualifiers in their key.
  public cacheHasQualifiedSources = false;

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
            cache.delete(KEY_PREFIX_SERVICE + url);
            // Keys of qualified sources also contain their qualifiers, so they can only be found by scanning.
            if (this.cacheHasQualifiedSources) {
              for (const key of cache.keys()) {
                if (key.endsWith(KEY_SEPARATOR_QUALIFIERS + url)) {
                  cache.delete(key);
                }
              }
            }
          } else {
            cache.clear();
            this.cacheHasQualifiedSources = false;
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
        }, context, KEY_PREFIX_SERVICE) ])));
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
    cacheKeyPrefix = '',
  ): Promise<IQuerySourceWrapper> {
    let sourcePromise: Promise<IQuerySourceWrapper> | undefined;

    // Try to read from cache
    const cacheKey = this.getCacheKey(querySourceUnidentified, cacheKeyPrefix);
    if (cacheKey !== undefined && this.cache) {
      sourcePromise = this.cache.get(cacheKey)!;
    }

    // If not in cache, identify the source
    if (!sourcePromise) {
      sourcePromise = this.mediatorQuerySourceIdentify.mediate({ querySourceUnidentified, context })
        .then(({ querySource }) => querySource);

      // Set in cache
      if (cacheKey !== undefined && this.cache) {
        this.cache.set(cacheKey, sourcePromise);
        this.cacheHasQualifiedSources ||= cacheKey.includes(KEY_SEPARATOR_QUALIFIERS);
      }
    }

    return sourcePromise;
  }

  /**
   * Determine the key under which an identified source is cached.
   *
   * Next to the source's url, the key contains everything that can make the same url identify into a different source:
   * its forced type, and the entries of its source context (such as its named graph or its authentication).
   * This ensures that a source is only reused by queries that pass the same source.
   *
   * @param querySourceUnidentified An unidentified source.
   * @param cacheKeyPrefix A prefix for the key.
   * @return The cache key, or undefined if the source can not be cached,
   *         because it has no url, or because its source context contains values that have no string representation.
   */
  public getCacheKey(
    querySourceUnidentified: QuerySourceUnidentifiedExpanded,
    cacheKeyPrefix: string,
  ): string | undefined {
    if (typeof querySourceUnidentified.value !== 'string') {
      return undefined;
    }

    const contextEntries: [string, string | number | boolean][] = [];
    const sourceContext = querySourceUnidentified.context;
    if (sourceContext) {
      for (const key of sourceContext.keys()) {
        const value: unknown = sourceContext.get(key);
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          contextEntries.push([ key.name, value ]);
        } else if (typeof value === 'object' && value && typeof (<RDF.Term> value).termType === 'string') {
          contextEntries.push([ key.name, termToString(<RDF.Term> value) ]);
        } else {
          return undefined;
        }
      }
    }

    if (!querySourceUnidentified.type && contextEntries.length === 0) {
      return cacheKeyPrefix + querySourceUnidentified.value;
    }
    contextEntries.sort(([ keyA ], [ keyB ]) => keyA.localeCompare(keyB));
    const qualifiers = JSON.stringify([ querySourceUnidentified.type ?? null, contextEntries ]);
    return cacheKeyPrefix + qualifiers + KEY_SEPARATOR_QUALIFIERS + querySourceUnidentified.value;
  }
}

export interface IActorOptimizeQueryOperationQuerySourceIdentifyArgs extends IActorOptimizeQueryOperationArgs {
  /**
   * If the SERVICE target should be assumed to be a SPARQL endpoint.
   * @default {false}
   */
  serviceForceSparqlEndpoint: boolean;
  /**
   * The maximum number of entries in the LRU cache, set to 0 to disable.
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
