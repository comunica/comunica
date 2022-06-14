import type {
  IActionHttp,
  IActorHttpOutput,
  IActorHttpArgs,
} from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import 'cross-fetch/polyfill';
import { CacheSemanticsHandler } from './CacheSemanticsHandler';
import type { IHttpCacheStorage } from './IHttpCacheStorage';

/**
 * A comunica Cache Http Actor.
 */
export class ActorHttpCache extends ActorHttp {
  private readonly cacheSemanticsHandler: CacheSemanticsHandler;

  public constructor(args: IActorHttpCacheArgs) {
    super(args);
    this.cacheSemanticsHandler = new CacheSemanticsHandler(args.cacheStorage);
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    if (await this.cacheSemanticsHandler.has(new Request(action.input, action.init))) {
      return { time: 1 };
    }
    return { time: Number.POSITIVE_INFINITY };
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const customFetch: ((
      input: RequestInfo,
      init?: RequestInit
    ) => Promise<Response>) | undefined = action.context?.get(KeysHttp.fetch) || fetch;
    return await this.cacheSemanticsHandler
      .fetchWithCache(new Request(action.input, action.init), customFetch);
  }
}

export interface IActorHttpCacheArgs extends IActorHttpArgs {
  /**
   * A storage object to be used by the cache
   */
  cacheStorage: IHttpCacheStorage;
}
