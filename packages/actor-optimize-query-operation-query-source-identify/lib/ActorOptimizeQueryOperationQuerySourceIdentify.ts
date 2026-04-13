import type { MediatorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery, KeysQueryOperation, KeysStatistics } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid, ActionContext } from '@comunica/core';
import type {
  IActionContext,
  AsyncServiceExecutor,
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
import { QuerySourceServiceExecutor } from './QuerySourceServiceExecutor';

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
        ({ url }: IActionHttpInvalidate) => url ? cache.delete(url) : cache.clear(),
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

    const services: Map<string, RDF.NamedNode> = new Map();
    algebraUtils.visitOperation(action.operation, {
      [Algebra.Types.SERVICE]: {
        preVisitor: () => ({ continue: false }),
        visitor: (serviceOperation) => {
          if (serviceOperation.name.termType === 'NamedNode') {
            services.set(serviceOperation.name.value, serviceOperation.name);
          }
        },
      },
    });

    if (services.size > 0) {
      const serviceExecutors: Record<string, AsyncServiceExecutor> = {};
      for (const [ service, serviceNamedNode ] of services.entries()) {
        const serviceExecutor = await this.getServiceExecutor(serviceNamedNode, context);
        if (serviceExecutor) {
          serviceExecutors[service] = serviceExecutor;
        }
      }

      // Identify sources of SERVICE targets, unless the whole query is passed to the source (e.g. for SPARQL endpoints)
      // and no custom executor needs to intercept a SERVICE clause locally.
      if (Object.keys(serviceExecutors).length > 0 ||
        !await passFullOperationToSource(action.operation, querySources ?? [], context)) {
        const serviceSources: Record<string, IQuerySourceWrapper> = {};
        for (const [ service, serviceNamedNode ] of services.entries()) {
          const serviceExecutor = serviceExecutors[service];
          serviceSources[service] = serviceExecutor ?
              { source: new QuerySourceServiceExecutor(serviceNamedNode.value, serviceExecutor) } :
            await this.identifySource({
              type: this.serviceForceSparqlEndpoint ? 'sparql' : undefined,
              value: serviceNamedNode.value,
            }, context);
        }
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
  ): Promise<IQuerySourceWrapper> {
    let sourcePromise: Promise<IQuerySourceWrapper> | undefined;

    // Try to read from cache
    // Only sources based on string values (e.g. URLs) are supported!
    if (typeof querySourceUnidentified.value === 'string' && this.cache) {
      sourcePromise = this.cache.get(querySourceUnidentified.value)!;
    }

    // If not in cache, identify the source
    if (!sourcePromise) {
      sourcePromise = this.mediatorQuerySourceIdentify.mediate({ querySourceUnidentified, context })
        .then(({ querySource }) => querySource);

      // Set in cache
      if (typeof querySourceUnidentified.value === 'string' && this.cache) {
        this.cache.set(querySourceUnidentified.value, sourcePromise);
      }
    }

    return sourcePromise;
  }

  public async getServiceExecutor(
    serviceNamedNode: RDF.NamedNode,
    context: IActionContext,
  ): Promise<AsyncServiceExecutor | undefined> {
    if (context.has(KeysInitQuery.serviceExecutorCreator) && context.has(KeysInitQuery.serviceExecutors)) {
      throw new Error('Illegal simultaneous usage of serviceExecutorCreator and serviceExecutors in context');
    }
    if (context.has(KeysInitQuery.serviceExecutorCreator)) {
      return context.getSafe(KeysInitQuery.serviceExecutorCreator)(serviceNamedNode);
    }
    if (context.has(KeysInitQuery.serviceExecutors)) {
      return context.getSafe(KeysInitQuery.serviceExecutors)[serviceNamedNode.value];
    }
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
