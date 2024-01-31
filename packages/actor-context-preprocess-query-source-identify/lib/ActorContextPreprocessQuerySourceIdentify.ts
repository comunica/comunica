import type { IActorContextPreprocessOutput, IActorContextPreprocessArgs } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IAction, IActorTest } from '@comunica/core';
import type { IQuerySourceWrapper, QuerySourceUnidentified,
  QuerySourceUnidentifiedExpanded, IActionContext } from '@comunica/types';
import { LRUCache } from 'lru-cache';

/**
 * A comunica Query Source Identify Context Preprocess Actor.
 */
export class ActorContextPreprocessQuerySourceIdentify extends ActorContextPreprocess {
  public readonly cacheSize: number;
  public readonly httpInvalidator: ActorHttpInvalidateListenable;
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
  public readonly cache?: LRUCache<string, Promise<IQuerySourceWrapper>>;

  public constructor(args: IActorContextPreprocessQuerySourceIdentifyArgs) {
    super(args);
    this.cache = this.cacheSize ? new LRUCache<string, any>({ max: this.cacheSize }) : undefined;
    const cache = this.cache;
    if (cache) {
      this.httpInvalidator.addInvalidateListener(
        ({ url }: IActionHttpInvalidate) => url ? cache.delete(url) : cache.clear(),
      );
    }
  }

  public async test(action: IAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IAction): Promise<IActorContextPreprocessOutput> {
    let context = action.context;

    // Rewrite sources
    if (context.has(KeysInitQuery.querySourcesUnidentified)) {
      const querySourcesUnidentified: QuerySourceUnidentified[] = action.context
        .get(KeysInitQuery.querySourcesUnidentified)!;
      const querySourcesUnidentifiedExpanded = querySourcesUnidentified
        .map(querySource => this.expandSource(querySource));
      const querySources: IQuerySourceWrapper[] = await Promise.all(querySourcesUnidentifiedExpanded
        .map(async querySourceUnidentified => this.identifySource(querySourceUnidentified, action.context)));
      context = action.context
        .delete(KeysInitQuery.querySourcesUnidentified)
        .set(KeysQueryOperation.querySources, querySources);
    }

    return { context };
  }

  public expandSource(querySource: QuerySourceUnidentified): QuerySourceUnidentifiedExpanded {
    if (typeof querySource === 'string' || 'match' in querySource) {
      return { value: querySource };
    }
    return querySource;
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
}

export interface IActorContextPreprocessQuerySourceIdentifyArgs extends IActorContextPreprocessArgs {
  /**
   * The maximum number of entries in the LRU cache, set to 0 to disable.
   * @range {integer}
   * @default {100}
   */
  cacheSize: number;
  /* eslint-disable max-len */
  /**
   * An actor that listens to HTTP invalidation events
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^2.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /* eslint-enable max-len */
  /**
   * Mediator for identifying query sources.
   */
  mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
}
